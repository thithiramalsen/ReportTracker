const express = require('express');
const multer = require('multer');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const router = express.Router();
const Report = require('../models/Report');
const ReportAccess = require('../models/ReportAccess');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Configure storage: prefer S3 when env vars are present, otherwise local disk
let upload;
let s3Client = null;
let useS3 = false;
const awsBucket = process.env.AWS_S3_BUCKET;
const awsRegion = process.env.AWS_REGION || 'us-east-1';
if (awsBucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  useS3 = true;
  s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  // use memory storage and upload manually with AWS SDK v3
  upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
      if (file.mimetype !== 'application/pdf') cb(new Error('Only PDF files are allowed'));
      else cb(null, true);
    }
  });
} else {
  // local disk
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('Only PDF files are allowed'));
      } else cb(null, true);
    }
  });
}

// POST /api/reports - admin only -> upload PDF + assign users
router.post('/', verifyToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, reportDate, userIds } = req.body;
    if (!title || !reportDate || !req.file) return res.status(400).json({ message: 'Missing fields' });

    let fileUrl = '';
    if (useS3 && req.file && req.file.buffer) {
      // upload buffer to S3 using AWS SDK v3
      const key = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + req.file.originalname;
      const uploadParams = {
        Bucket: awsBucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };

      try {
        const uploader = new Upload({ client: s3Client, params: uploadParams });
        await uploader.done();
        // Construct a public URL. If your bucket is not public, consider generating presigned URLs instead.
        fileUrl = `https://${awsBucket}.s3.${awsRegion}.amazonaws.com/${encodeURIComponent(key)}`;
      } catch (uploadErr) {
        return res.status(500).json({ message: 'S3 upload failed', error: uploadErr.message });
      }
    } else if (req.file && req.file.filename) {
      fileUrl = '/uploads/' + req.file.filename;
    }
    const report = new Report({
      title,
      description: description || '',
      reportDate: new Date(reportDate),
      fileUrl
    });
    await report.save();

    // Assign to users
    let parsedUserIds = [];
    if (userIds) {
      try {
        parsedUserIds = typeof userIds === 'string' ? JSON.parse(userIds) : userIds;
      } catch (e) {
        // If not JSON, assume comma separated
        parsedUserIds = typeof userIds === 'string' ? userIds.split(',').map(s => s.trim()) : [];
      }
    }

    const accessRecords = parsedUserIds.map((uid) => ({ reportId: report._id, userId: uid }));
    if (accessRecords.length) await ReportAccess.insertMany(accessRecords);

    res.status(201).json({ message: 'Report uploaded', report });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/reports - admin -> all; user -> assigned
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const reports = await Report.find().sort({ reportDate: -1 });
      return res.json(reports);
    }

    // user: find reportIds from ReportAccess
    const accesses = await ReportAccess.find({ userId: req.user.id }).select('reportId');
    const reportIds = accesses.map(a => a.reportId);
    const reports = await Report.find({ _id: { $in: reportIds } }).sort({ reportDate: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
