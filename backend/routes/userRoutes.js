const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// GET /api/users - admin only
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/users/:id - admin only -> update fields
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, code, role, phone, email, isApproved } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (code !== undefined) update.code = String(code).trim().toLowerCase();
    if (role !== undefined) update.role = role;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email ? String(email).trim().toLowerCase() : undefined;
    if (isApproved !== undefined) update.isApproved = isApproved;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/users/:id - admin only -> delete user and associated access
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // remove report access entries for deleted user
    const ReportAccess = require('../models/ReportAccess');
    await ReportAccess.deleteMany({ userId });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
