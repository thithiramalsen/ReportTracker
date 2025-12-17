const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const notifier = require('../utils/notifier');

// GET /api/notifications - user's notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/notifications/:id/read - mark as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ message: 'Not found' });
    if (String(n.userId) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });
    n.read = true;
    await n.save();
    res.json({ message: 'Marked read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// SSE stream for notifications: /api/notifications/stream?token=JWT
router.get('/stream', async (req, res) => {
  try {
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).end();
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch (e) { return res.status(401).end(); }

    // headers for SSE
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    });
    res.write('\n');

    // add client
    notifier.addClient(res);

    req.on('close', () => {
      notifier.removeClient(res);
    });
  } catch (err) {
    console.error('SSE stream error', err.message);
    res.status(500).end();
  }
});

module.exports = router;
