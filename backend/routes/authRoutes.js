const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const crypto = require('crypto');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { validatePassword } = require('../utils/password');
const CodeSlot = require('../models/CodeSlot');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');

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
    const userData = { name, code, password: hash, role: role || 'user', phone };
    if (email) userData.email = email;
    const user = new User(userData);
    await user.save();

    // Send email verification if enabled and email present
    try {
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && user.email) {
        const vtoken = crypto.randomBytes(20).toString('hex');
        user.emailVerificationToken = vtoken;
        user.emailVerificationExpires = Date.now() + (24 * 60 * 60 * 1000); // 24h
        user.isVerified = false;
        await user.save();
        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = `${frontend}/verify-email?token=${vtoken}`;
        const info = await sendEmail({ to: user.email, subject: 'Verify your email', text: `Verify: ${link}`, html: `<p>Verify your email: <a href="${link}">Verify</a></p>` });
        if (info && info.previewUrl) console.log('[AUTH][REGISTER] email preview:', info.previewUrl);
      }
    } catch (e) { console.error('[AUTH][REGISTER] email verification send failed', e && e.message ? e.message : e); }

    res.status(201).json({ message: 'User created', user: { id: user._id, name: user.name, code: user.code, role: user.role, phone: user.phone, email: user.email, isApproved: user.isApproved } });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ message: 'Duplicate value exists (email or code). Contact admin.' });
    console.error('[AUTH][REGISTER] error:', err && err.stack ? err.stack : err);
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
    const userData = { name, code, password: hash, role: slot.role || 'user', phone, isApproved: false };
    if (email) userData.email = email;
    const user = new User(userData);
    try {
      await user.save();
    } catch (saveErr) {
      if (saveErr && saveErr.code === 11000) {
        // duplicate key (likely email null/index) -> friendly error
        console.error('[AUTH][SIGNUP] duplicate key on save', saveErr.message);
        return res.status(400).json({ message: 'Duplicate value exists (email or code). Contact admin.' });
      }
      throw saveErr;
    }

    slot.usedBy = user._id;
    await slot.save();

    // Send email verification if enabled and email present
    try {
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && user.email) {
        const vtoken = crypto.randomBytes(20).toString('hex');
        user.emailVerificationToken = vtoken;
        user.emailVerificationExpires = Date.now() + (24 * 60 * 60 * 1000); // 24h
        user.isVerified = false;
        await user.save();
        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = `${frontend}/verify-email?token=${vtoken}`;
        const info = await sendEmail({ to: user.email, subject: 'Verify your email', text: `Verify: ${link}`, html: `<p>Verify your email: <a href="${link}">Verify</a></p>` });
        if (info && info.previewUrl) console.log('[AUTH][SIGNUP] email preview:', info.previewUrl);
      }
    } catch (e) { console.error('[AUTH][SIGNUP] email verification send failed', e && e.message ? e.message : e); }

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

    let token = null;
    try {
      if (process.env.JWT_SECRET) {
        token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
      } else {
        console.warn('[AUTH][SIGNUP] JWT_SECRET not set; skipping token generation');
      }
    } catch (e) {
      console.error('[AUTH][SIGNUP] token generation failed', e && e.stack ? e.stack : e);
      token = null;
    }

    res.status(201).json({ message: 'Account created. Awaiting admin approval.', token, user: { id: user._id, name: user.name, code: user.code, role: user.role, phone: user.phone, email: user.email, isApproved: user.isApproved } });
  } catch (err) {
    console.error('[AUTH][SIGNUP] error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Email verification
// If REQUIRE_EMAIL_VERIFICATION=true, users will receive verification emails on signup/register
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Missing token' });
  try {
    const user = await User.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return res.json({ message: 'Email verified' });
  } catch (err) {
    console.error('[AUTH][VERIFY]', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password - send reset email
router.post('/forgot', async (req, res) => {
  const { email, code } = req.body;
  try {
    let user = null;
    if (email) user = await User.findOne({ email: String(email).trim().toLowerCase() });
    else if (code) user = await User.findOne({ code: String(code).trim().toLowerCase() });
    if (!user) return res.status(400).json({ message: 'User not found or no email available' });
    if (!user.email) return res.status(400).json({ message: 'No email set for this account. Contact admin.' });

    // generate short numeric verification code (6 digits)
    const vcode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = vcode;
    user.resetPasswordExpires = Date.now() + (60 * 60 * 1000); // 1 hour
    await user.save();

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontend}/reset?code=${vcode}`;
    const subject = 'Password reset code';
    const text = `Your password reset code is: ${vcode}\nYou can also open: ${resetLink}`;
    const html = `<p>Your password reset code is: <strong>${vcode}</strong></p><p>You can also open <a href="${resetLink}">this link</a>.</p>`;

    try {
      const info = await sendEmail({ to: user.email, subject, text, html });
      if (info && info.previewUrl) console.log('[AUTH][FORGOT] previewUrl:', info.previewUrl);
      const resp = { message: 'Reset email sent if account exists' };
      if (info && info.previewUrl && process.env.NODE_ENV !== 'production') resp.previewUrl = info.previewUrl;
      return res.json(resp);
    } catch (e) { console.error('[AUTH][FORGOT] email send failed', e && e.message ? e.message : e); return res.json({ message: 'Reset email sent if account exists' }); }
  } catch (err) {
    console.error('[AUTH][FORGOT]', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Reset password using token
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Missing fields' });
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return res.status(400).json({ message: 'Weak password', errors: pwCheck.errors });
  try {
    // support both full tokens and short numeric codes (code field may be used)
    const codeOrToken = token
    const user = await User.findOne({ resetPasswordToken: codeOrToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = await require('bcryptjs').hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: 'Password reset' });
  } catch (err) {
    console.error('[AUTH][RESET]', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
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

    let loginToken = null;
    try {
      if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not configured');
      loginToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    } catch (e) {
      console.error('[AUTH][LOGIN] token generation failed', e && e.stack ? e.stack : e);
      return res.status(500).json({ message: 'Server error', error: 'Auth system not configured' });
    }

    res.json({ token: loginToken, user: { id: user._id, name: user.name, code: user.code, role: user.role, phone: user.phone, email: user.email, isApproved: user.isApproved } });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ message: 'Duplicate value exists (email or code). Contact admin.' });
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
