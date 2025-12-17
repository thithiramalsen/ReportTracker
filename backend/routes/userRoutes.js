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

    const userBefore = await User.findById(req.params.id);
    if (!userBefore) return res.status(404).json({ message: 'User not found' });

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');

    // If admin revoked approval (set isApproved=false), free any CodeSlot usedBy this user
    if (isApproved === false) {
      const CodeSlot = require('../models/CodeSlot');
      try {
        await CodeSlot.updateMany({ usedBy: user._id }, { $unset: { usedBy: '' } });
      } catch (e) {
        console.error('Failed to free codeslots on revoke', e.message);
      }
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/users/:id/approve - admin only -> approve a pending user
router.post('/:id/approve', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isApproved) return res.status(400).json({ message: 'User already approved' });

    user.isApproved = true;
    await user.save();
    res.json({ message: 'User approved', user: { id: user._id, name: user.name, code: user.code, isApproved: user.isApproved } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/users/:id/deny - admin only -> deny (delete) pending user and free code slot
router.post('/:id/deny', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // free any codeslot that references this user
    const CodeSlot = require('../models/CodeSlot');
    try {
      await CodeSlot.updateMany({ usedBy: user._id }, { $unset: { usedBy: '' } });
    } catch (e) {
      console.error('Failed to free codeslots on deny', e.message);
    }

    // remove the user and their report access
    const userId = user._id;
    await User.findByIdAndDelete(userId);
    const ReportAccess = require('../models/ReportAccess');
    await ReportAccess.deleteMany({ userId });

    res.json({ message: 'User denied and removed' });
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
