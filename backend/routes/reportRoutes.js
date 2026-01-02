const express = require('express');
const multer = require('multer');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const router = express.Router();
const Report = require('../models/Report');
const ReportAccess = require('../models/ReportAccess');
const User = require('../models/User');
const { notifyReportUpload: notifyWhatsApp } = require('../utils/whatsapp');
const { notifyReportUpload: notifySms } = require('../utils/notifylk');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
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

// helper to extract object key from an S3 URL that looks like https://bucket.s3.region.amazonaws.com/key
function extractS3Key(url) {
  try {
    const u = new URL(url);
    // pathname starts with /key...
    let key = u.pathname;
    if (key.startsWith('/')) key = key.slice(1);
    return decodeURIComponent(key);
  } catch (e) {
    console.error('[REPORTS][S3] failed to parse url', url, e.message);
    return null;
  }
}

function s3FilenameFromKey(key) {
  try {
    if (!key) return 'file';
    const parts = key.split('/');
    return parts[parts.length - 1] || 'file';
  } catch (e) {
    return 'file';
  }
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

    // Assign to users (accepts userIds and/or codes)
    let parsedUserIds = [];
    if (userIds) {
      try {
        parsedUserIds = typeof userIds === 'string' ? JSON.parse(userIds) : userIds;
      } catch (e) {
        // If not JSON, assume comma separated
        parsedUserIds = typeof userIds === 'string' ? userIds.split(',').map(s => s.trim()) : [];
      }
    }

    // If codes provided, resolve users with those division codes
    let parsedCodes = [];
    if (req.body.codes) {
      try {
        parsedCodes = typeof req.body.codes === 'string' ? JSON.parse(req.body.codes) : req.body.codes;
      } catch (e) {
        parsedCodes = typeof req.body.codes === 'string' ? req.body.codes.split(',').map(s => s.trim().toLowerCase()) : [];
      }
      if (parsedCodes && parsedCodes.length) {
        const usersFromCodes = await User.find({ code: { $in: parsedCodes.map(c => String(c).trim().toLowerCase()) } }).select('_id');
        const idsFromCodes = usersFromCodes.map(u => String(u._id));
        parsedUserIds = Array.from(new Set([...parsedUserIds, ...idsFromCodes]));
      }
    }

    const accessRecords = parsedUserIds.map((uid) => ({ reportId: report._id, userId: uid }));
    if (accessRecords.length) await ReportAccess.insertMany(accessRecords);

    if (parsedUserIds.length) {
      const assignedUsers = await User.find({ _id: { $in: parsedUserIds } }).select('name phone code email');

      // create in-app notifications for assigned users
      try {
        const Notification = require('../models/Notification');
        const notifs = assignedUsers.filter(u => u).map(u => ({
          userId: u._id,
          type: 'report_uploaded',
          message: `New report: ${report.title}`,
          data: { reportId: report._id, downloadUrl: `/api/reports/${report._id}/download` }
        }));
        if (notifs.length) {
          const created = await Notification.insertMany(notifs);
          // push SSE events
          try {
            const notifier = require('../utils/notifier');
            created.forEach(n => notifier.sendEvent('notification', n));
          } catch (e) { console.error('Failed to send SSE for report notifications', e.message) }
        }
      } catch (e) {
        console.error('Failed to create notifications for users', e.message);
      }

      // non-blocking notifications: WhatsApp + SMS (notify.lk)
      try { notifyWhatsApp({ report, users: assignedUsers }).catch(err => console.error('whatsapp notify failed', err.message)); } catch(e) { console.error('whatsapp notify invocation failed', e.message) }
      try { notifySms({ report, users: assignedUsers }).catch(err => console.error('notifylk sms failed', err.message)); } catch(e) { console.error('notifylk notify invocation failed', e.message) }
    }

    res.status(201).json({ message: 'Report uploaded', report });
  } catch (err) {
    console.error('[REPORTS][UPLOAD] error:', err && err.stack ? err.stack : err);
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
// Behavior: If request is from a browser (Accept: text/html) and unauthenticated,
// redirect to frontend login page with `next` param. For API/XHR requests, return JSON 401/403 as before.
router.get('/:id/download', async (req, res) => {
  try {
    // Attempt to authenticate from Authorization header (Bearer token)
    let user = null;
    let hasAuthHeader = false;
    try {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        hasAuthHeader = true;
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = { id: decoded.id, role: decoded.role };
      }
    } catch (e) {
      // token invalid/expired - treat as unauthenticated
      console.warn('[REPORTS][DOWNLOAD] token invalid or expired');
      user = null;
    }

    const acceptsHtml = req.headers.accept && req.headers.accept.indexOf('text/html') !== -1;
    const isBrowserNav = acceptsHtml || !hasAuthHeader;

    // If unauthenticated and this looks like a browser navigation, redirect to login with next
    if (!user && isBrowserNav) {
      const frontend = process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, '') : '';
      const loginPath = '/auth/login';
      const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const redirectTo = frontend ? `${frontend}${loginPath}?next=${encodeURIComponent(currentUrl)}` : `${loginPath}?next=${encodeURIComponent(currentUrl)}`;
      console.log('[REPORTS][DOWNLOAD] unauthenticated browser request - redirecting to', redirectTo);
      return res.redirect(302, redirectTo);
    }
    if (!user) return res.status(401).json({ message: 'No token provided' });

    // fetch report and perform access check
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (user.role !== 'admin') {
      const access = await ReportAccess.findOne({ reportId: report._id, userId: user.id });
      if (!access) {
        if (isBrowserNav) {
          const frontend = process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, '') : '';
          const loginPath = '/auth/login';
          const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          const redirectTo = frontend ? `${frontend}${loginPath}?next=${encodeURIComponent(currentUrl)}` : `${loginPath}?next=${encodeURIComponent(currentUrl)}`;
          console.log('[REPORTS][DOWNLOAD] forbidden for user, redirecting to login', { user: user.id, reportId: String(report._id) });
          return res.redirect(302, redirectTo);
        }
        return res.status(403).json({ message: 'Not authorized to access this report' });
      }
    }

    const url = report.fileUrl;
    console.log('[REPORTS][DOWNLOAD] report', report._id, 'fileUrl=', url);
    if (!url) return res.status(404).json({ message: 'File not available' });

    if (useS3 && url.startsWith('http')) {
      const objectKey = extractS3Key(url);
      if (!objectKey) return res.status(500).json({ message: 'Invalid file URL' });
      try {
        console.log('[REPORTS][DOWNLOAD][S3] streaming', { reportId: String(report._id), objectKey, user: user && user.id, acceptsHtml });
        const command = new GetObjectCommand({ Bucket: awsBucket, Key: objectKey });
        const data = await s3Client.send(command);
        res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
        if (data.ContentLength) res.setHeader('Content-Length', data.ContentLength);
        const fname = s3FilenameFromKey(objectKey);
        res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
        if (data.Body && typeof data.Body.pipe === 'function') {
          data.Body.pipe(res);
          data.Body.on('error', (err) => {
            console.error('[REPORTS][DOWNLOAD][S3] stream error', err.message || err);
            if (!res.headersSent) res.status(500).end('Stream error');
          });
          return;
        }
        // fallback: if Body is a blob/arraybuffer-like
        if (data.Body) {
          res.send(data.Body);
          return;
        }
        return res.status(500).json({ message: 'Empty file stream' });
      } catch (e) {
        console.error('[REPORTS][DOWNLOAD][S3] stream failed', e.message || e);
        return res.status(500).json({ message: 'Unable to stream file' });
      }
    }

    // local file
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '');
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      const exists = fs.existsSync(filePath);
      console.log('[REPORTS][DOWNLOAD] local filePath=', filePath, 'exists=', exists);
      if (!exists) {
        // If request from browser, show friendly page instead of raw JSON
        if (acceptsHtml) {
          const frontend = process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, '') : '';
          const loginPath = '/auth/login';
          const message = `File is not available on the server. Please log in to access or contact admin.`;
          // simple HTML response directing to login
          const loginUrl = frontend ? `${frontend}${loginPath}` : loginPath;
          return res.status(404).send(`<html><body><h3>${message}</h3><p><a href="${loginUrl}">Log in</a></p></body></html>`);
        }
        return res.status(404).json({ message: 'File missing on server' });
      }
      return res.download(filePath);
    }

    // fallback: redirect to url
    return res.redirect(url);
  } catch (err) {
    console.error('[REPORTS][DOWNLOAD] error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/reports/:id - admin only: delete report and associated access and file
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const fileUrl = report.fileUrl || '';

    // attempt to delete file (S3 or local), but don't block report deletion
    try {
      if (useS3 && fileUrl.startsWith('http')) {
        try {
          // try to extract object key by URL parsing
          const url = new URL(fileUrl);
          // object key is path after bucket name; try to remove leading /<bucket>/
          let objectKey = url.pathname;
          const bucketIndex = objectKey.indexOf(`/${awsBucket}/`);
          if (bucketIndex !== -1) objectKey = objectKey.substring(bucketIndex + awsBucket.length + 2);
          if (objectKey.startsWith('/')) objectKey = objectKey.substring(1);
          await s3Client.send(new DeleteObjectCommand({ Bucket: awsBucket, Key: objectKey }));
        } catch (s3err) {
          console.error('S3 delete failed', s3err.message);
        }
      } else if (fileUrl.startsWith('/uploads/')) {
        const filename = fileUrl.replace('/uploads/', '');
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          try { await unlinkAsync(filePath); } catch (e) { console.error('unlink failed', e.message); }
        }
      }
    } catch (e) {
      console.error('File deletion attempt failed', e.message);
    }

    // remove access records and report (ensure these run)
    try { await ReportAccess.deleteMany({ reportId: report._id }); } catch (e) { console.error('Failed to delete access records', e.message); }
    try { await report.deleteOne(); } catch (e) { console.error('Failed to delete report record', e.message); }

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
