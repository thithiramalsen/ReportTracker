const express = require('express');
const multer = require('multer');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const router = express.Router();
const Report = require('../models/Report');
const ReportAccess = require('../models/ReportAccess');
const User = require('../models/User');
const { notifyReportUpload } = require('../utils/whatsapp');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

    if (parsedUserIds.length) {
      const assignedUsers = await User.find({ _id: { $in: parsedUserIds } }).select('name phone code email');
      notifyReportUpload({ report, users: assignedUsers }).catch(err => console.error('whatsapp notify failed', err.message));
    }

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
      // attach assigned users for admin view
      const results = [];
      for (const r of reports) {
        const accesses = await ReportAccess.find({ reportId: r._id }).populate('userId', 'name email');
        const users = accesses.map(a => ({ id: a.userId._id, name: a.userId.name, email: a.userId.email }));
        results.push(Object.assign(r.toObject(), { assignedUsers: users }));
      }
      return res.json(results);
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

// GET /api/reports/:id/download - allow admin or assigned users to download
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Check access
    if (req.user.role !== 'admin') {
      const access = await ReportAccess.findOne({ reportId: report._id, userId: req.user.id });
      if (!access) return res.status(403).json({ message: 'Not authorized to access this report' });
    }

    const url = report.fileUrl;
    if (!url) return res.status(404).json({ message: 'File not available' });

    if (useS3 && url.startsWith('http')) {
      // redirect to S3 URL (assumes public)
      return res.redirect(url);
    }

    // local file
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '');
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server' });
      return res.download(filePath);
    }

    // fallback: redirect to url
    return res.redirect(url);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/reports/:id - admin only: delete report and associated access and file
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const fileUrl = report.fileUrl || '';

    // delete file from S3 or local
    if (useS3 && fileUrl.startsWith('http')) {
      // extract key from URL
      try {
        const parts = fileUrl.split('/');
        const key = decodeURIComponent(parts.slice(3).join('/').split('/').slice(1).join('/'));
        // Above parsing is brittle; instead, remove bucket host prefix
        // Find index of bucket name
        const idx = fileUrl.indexOf(`/${awsBucket}/`);
        let objectKey = key;
        if (idx !== -1) {
          objectKey = fileUrl.substring(idx + awsBucket.length + 2);
        }
        await s3Client.send(new DeleteObjectCommand({ Bucket: awsBucket, Key: objectKey }));
      } catch (e) {
        // log and continue
        console.error('S3 delete failed', e.message);
      }
    } else if (fileUrl.startsWith('/uploads/')) {
      const filename = fileUrl.replace('/uploads/', '');
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(filePath)) {
        try { await unlinkAsync(filePath); } catch (e) { console.error('unlink failed', e.message); }
      }
    }

    // remove access records and report
    await ReportAccess.deleteMany({ reportId: report._id });
    await report.remove();

    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/reports/:id/assign - admin only: update assigned users
router.patch('/:id/assign', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { userIds } = req.body; // expect array
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    let parsed = [];
    if (Array.isArray(userIds)) parsed = userIds;
    else if (typeof userIds === 'string') {
      try { parsed = JSON.parse(userIds); } catch (e) { parsed = userIds.split(',').map(s=>s.trim()); }
    }

    // replace access records
    await ReportAccess.deleteMany({ reportId: report._id });
    if (parsed.length) {
      const accessRecords = parsed.map(uid => ({ reportId: report._id, userId: uid }));
      await ReportAccess.insertMany(accessRecords);
    }

    const accesses = await ReportAccess.find({ reportId: report._id }).populate('userId', 'name email');
    const users = accesses.map(a => ({ id: a.userId._id, name: a.userId.name, email: a.userId.email }));
    res.json({ message: 'Assignments updated', assignedUsers: users });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
