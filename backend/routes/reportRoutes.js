const express = require('express');
const multer = require('multer');
const path = require('path');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

const router = express.Router();
const Report = require('../models/Report');
const ReportAccess = require('../models/ReportAccess');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Configure storage: prefer S3 when env vars are present, otherwise local disk
let upload;
if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
  const s3 = new aws.S3();

  const s3Storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + file.originalname;
      cb(null, unique);
    }
  });

  upload = multer({
    storage: s3Storage,
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
    if (req.file && req.file.location) {
      // multer-s3 provides `location`
      fileUrl = req.file.location;
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
