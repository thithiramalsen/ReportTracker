const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
const { validatePassword } = require('../utils/password');

// Admin creates users
router.post('/register', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    // Validate password strength
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ message: 'Weak password', errors: pwCheck.errors });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hash, role: role || 'user' });
    await user.save();

    res.status(201).json({ message: 'User created', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Public signup - create account as 'user'
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const verifyToken = crypto.randomBytes(24).toString('hex');
    const user = new User({ name, email, password: hash, role: 'user', verifyToken, isVerified: false });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Try sending verification email; if SMTP not configured, return token for testing
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${verifyToken}`;
    const message = `Please verify your account by visiting: ${verifyUrl}`;
    try {
      const info = await sendEmail({ to: email, subject: 'Verify your account', text: message, html: `<p>${message}</p>` });
      const resp = { message: 'User created. Verification email sent.', token, user: { id: user._id, name: user.name, email: user.email, role: user.role } };
      if (info && info.previewUrl) resp.previewUrl = info.previewUrl;
      return res.status(201).json(resp);
    } catch (e) {
      // If sendEmail threw, fall back to returning the token for testing
      return res.status(201).json({ message: 'User created (no SMTP)', token, user: { id: user._id, name: user.name, email: user.email, role: user.role }, verifyToken });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Email verification
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Missing token' });
  try {
    const user = await User.findOne({ verifyToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid token' });
    user.isVerified = true;
    user.verifyToken = undefined;
    await user.save();
    res.json({ message: 'Account verified' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Forgot password: generate reset token and email it (or return token if SMTP not configured)
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Missing email' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link was sent' });

    const resetToken = crypto.randomBytes(24).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset/${resetToken}`;
    const message = `Reset your password: ${resetUrl}`;
    try {
      const info = await sendEmail({ to: email, subject: 'Password reset', text: message, html: `<p>${message}</p>` });
      const resp = { message: 'Reset email sent' };
      if (info && info.previewUrl) resp.previewUrl = info.previewUrl;
      return res.json(resp);
    } catch (e) {
      // SMTP not configured — return token for testing
      return res.json({ message: 'Reset token (no SMTP)', resetToken });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Missing fields' });
  try {
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // Validate password strength on reset
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ message: 'Weak password', errors: pwCheck.errors });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
