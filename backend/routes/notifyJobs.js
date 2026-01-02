const express = require('express');
const router = express.Router();
const SmsJob = require('../models/SmsJob');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const notifylk = require('../utils/notifylk');

// GET /api/notify/jobs - admin list
router.get('/jobs', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const jobs = await SmsJob.find().sort({ createdAt: -1 }).limit(200);
    res.json(jobs);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

// GET /api/notify/analytics - simple counts
router.get('/analytics', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const total = await SmsJob.countDocuments();
    const sent = await SmsJob.countDocuments({ status: 'sent' });
    const failed = await SmsJob.countDocuments({ status: 'failed' });
    const pending = await SmsJob.countDocuments({ status: 'pending' });
    // last 7 days aggregation
    const last7 = await SmsJob.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, status: 1 } },
      { $group: { _id: { day: '$day', status: '$status' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.day', counts: { $push: { k: '$_id.status', v: '$count' } } } },
      { $project: { _id: 0, day: '$_id', counts: { $arrayToObject: '$counts' } } },
      { $sort: { day: 1 } }
    ]);

    res.json({ total, sent, failed, pending, last7 });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

// PATCH /api/notify/jobs/:id/retry - admin triggers a retry
router.patch('/jobs/:id/retry', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const job = await SmsJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.status = 'pending'; job.attempts = 0; job.lastError = undefined; await job.save();
    // try immediate process
    try { await notifylk.processJob(job); } catch(e) { console.error('retry process failed', e.message || e); }
    res.json({ message: 'Retry scheduled', job });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

// PATCH /api/notify/jobs/:id/resolve - mark resolved (manual)
router.patch('/jobs/:id/resolve', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const job = await SmsJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.status = 'resolved'; await job.save();
    res.json({ message: 'Marked resolved', job });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

module.exports = router;
