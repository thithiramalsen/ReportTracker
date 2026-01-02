const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { validatePassword } = require('../utils/password');
const CodeSlot = require('../models/CodeSlot');
const Notification = require('../models/Notification');

// Admin creates users (code + password)
router.post('/register', verifyToken, requireRole('admin'), async (req, res) => {
  let { name, code, password, role, phone, email } = req.body;
  if (!name || !code || !password) return res.status(400).json({ message: 'Missing fields' });

  code = String(code).trim().toLowerCase();
  email = email ? String(email).trim().toLowerCase() : undefined;

  try {
    const existing = await User.findOne({ code });
    if (existing) return res.status(400).json({ message: 'User already exists for this code' });

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ message: 'Weak password', errors: pwCheck.errors });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, code, password: hash, role: role || 'user', phone, email });
    await user.save();

    res.status(201).json({ message: 'User created', user: { id: user._id, name: user.name, code: user.code, role: user.role, phone: user.phone, email: user.email, isApproved: user.isApproved } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Public signup (code + password) -> creates pending user; requires available code slot
router.post('/signup', async (req, res) => {
  let { name, code, password, phone, email } = req.body;
  if (!name || !code || !password) return res.status(400).json({ message: 'Missing fields' });

  code = String(code).trim().toLowerCase();
  email = email ? String(email).trim().toLowerCase() : undefined;

  try {
    const slot = await CodeSlot.findOne({ code, isActive: true, usedBy: { $exists: false } });
    if (!slot) return res.status(400).json({ message: 'Code not available. Contact admin.' });

    const existingUser = await User.findOne({ code });
    if (existingUser) return res.status(400).json({ message: 'User already exists for this code' });

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ message: 'Weak password', errors: pwCheck.errors });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, code, password: hash, role: slot.role || 'user', phone, email, isApproved: false });
    await user.save();

    slot.usedBy = user._id;
    await slot.save();

    // notify admins about new signup
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins && admins.length) {
        const notifs = admins.map(a => ({ userId: a._id, type: 'new_signup', message: `New signup: ${user.name} (${user.code})`, data: { userId: user._id, code: user.code } }));
        const created = await Notification.insertMany(notifs);
        // push SSE events
        try {
          const notifier = require('../utils/notifier');
          created.forEach(n => notifier.sendEvent('notification', n));
        } catch (e) { console.error('Failed to send SSE for signup', e.message) }
      }
    } catch (e) {
      console.error('Failed to create admin notifications', e.message);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ message: 'Account created. Awaiting admin approval.', token, user: { id: user._id, name: user.name, code: user.code, role: user.role, phone: user.phone, email: user.email, isApproved: user.isApproved } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Email verification disabled
router.get('/verify', (req, res) => {
  res.status(410).json({ message: 'Verification not required. Contact admin for access.' });
});

// Forgot/reset disabled (admin resets passwords)
router.post('/forgot', (req, res) => {
  res.status(410).json({ message: 'Password reset is handled by admin.' });
});

router.post('/reset', (req, res) => {
  res.status(410).json({ message: 'Password reset is handled by admin.' });
});

// Admin reset password
router.post('/admin-reset', verifyToken, requireRole('admin'), async (req, res) => {
  let { code, userId, password } = req.body;
  if (!password || (!code && !userId)) return res.status(400).json({ message: 'Missing fields' });

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return res.status(400).json({ message: 'Weak password', errors: pwCheck.errors });

  code = code ? String(code).trim().toLowerCase() : undefined;

  try {
    const user = code ? await User.findOne({ code }) : await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login with code + password
router.post('/login', async (req, res) => {
  let { code, password } = req.body;
  if (!code || !password) return res.status(400).json({ message: 'Missing fields' });

  code = String(code).trim().toLowerCase();

  try {
    const user = await User.findOne({ code });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: { id: user._id, name: user.name, code: user.code, role: user.role, phone: user.phone, email: user.email, isApproved: user.isApproved } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
