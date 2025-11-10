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

module.exports = router;
