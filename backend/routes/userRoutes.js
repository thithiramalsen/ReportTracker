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
