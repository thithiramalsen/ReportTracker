const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const User = require('../models/User');

// POST /api/feedback - representatives submit feedback/comments (authenticated)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { message, type, senderName, senderEmail } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const fb = new Feedback({
      userId: req.user?.id || undefined,
      reportId: req.body.reportId || undefined,
      senderName: senderName || (req.user && req.user.name) || undefined,
      senderEmail: senderEmail || (req.user && req.user.email) || undefined,
      message,
      type: type || 'feedback',
    });
    await fb.save();

    // notify admins about new feedback
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const Notification = require('../models/Notification');
      const notifs = admins.map(a => ({ userId: a._id, type: 'feedback_submitted', message: `New feedback submitted${fb.reportId ? ' for a report' : ''}`, data: { feedbackId: fb._id, reportId: fb.reportId } }));
      if (notifs.length) {
        const created = await Notification.insertMany(notifs);
        try {
          const notifier = require('../utils/notifier');
          created.forEach(n => notifier.sendEvent('notification', n));
        } catch (e) { console.error('Failed to send SSE for feedback notifications', e && e.message ? e.message : e) }
      }
    } catch (e) { console.error('Failed to create admin notifications for feedback', e && e.message ? e.message : e) }

    return res.status(201).json({ message: 'Feedback submitted', feedback: fb });
  } catch (err) {
    console.error('[FEEDBACK][POST] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/feedback - admin: list all feedback (optional ?reportId=...)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const q = {};
    if (req.query.reportId) q.reportId = req.query.reportId;
    const items = await Feedback.find(q).sort({ createdAt: -1 }).populate('userId', 'name email').populate('reportId', 'title reportDate');
    res.json(items);
  } catch (err) {
    console.error('[FEEDBACK][GET] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/feedback/mine - authenticated: list own feedback
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const items = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 }).populate('reportId', 'title reportDate');
    res.json(items);
  } catch (err) {
    console.error('[FEEDBACK][MINE] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/feedback/:id - admin or owner
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id).populate('userId', 'name email').populate('reportId', 'title reportDate');
    if (!fb) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'admin' && String(fb.userId?._id) !== String(req.user.id)) return res.status(403).json({ message: 'Not authorized' });
    res.json(fb);
  } catch (err) {
    console.error('[FEEDBACK][GETID] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/feedback/:id/reply - admin replies to feedback
router.patch('/:id/reply', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { text, status } = req.body;
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Not found' });
    fb.response = { text: text || '', adminId: req.user.id, respondedAt: new Date() };
    if (status) fb.status = status;
    await fb.save();
    // optionally notify the original user via Notification model
    try {
      if (fb.userId) {
        const Notification = require('../models/Notification');
        await Notification.create({ userId: fb.userId, type: 'feedback_response', message: `Response to your feedback`, data: { feedbackId: fb._id } });
      }
    } catch (e) { console.error('Failed to create notification for feedback reply', e.message) }
    res.json({ message: 'Reply saved', feedback: fb });
  } catch (err) {
    console.error('[FEEDBACK][REPLY] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/feedback/:id/status - admin changes status
router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open','closed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Not found' });
    fb.status = status;
    await fb.save();
    res.json({ message: 'Status updated', feedback: fb });
  } catch (err) {
    console.error('[FEEDBACK][STATUS] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/feedback/:id - admin delete
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await Feedback.deleteOne({ _id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[FEEDBACK][DELETE] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
