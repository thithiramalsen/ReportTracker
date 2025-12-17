const express = require('express');
const router = express.Router();
const CodeSlot = require('../models/CodeSlot');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Admin: list all code slots
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const codes = await CodeSlot.find().sort({ code: 1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Public: list available codes (not used, active)
router.get('/available', async (req, res) => {
  try {
    const codes = await CodeSlot.find({ isActive: true, usedBy: { $exists: false } }).sort({ code: 1 }).select('code label role');
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: create code slot
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  let { code, label, role } = req.body;
  if (!code) return res.status(400).json({ message: 'Missing code' });
  code = String(code).trim().toLowerCase();
  try {
    const existing = await CodeSlot.findOne({ code });
    if (existing) return res.status(400).json({ message: 'Code already exists' });
    const slot = new CodeSlot({ code, label, role: role || 'user' });
    await slot.save();
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: delete code slot (only if unused)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const slot = await CodeSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Not found' });
    if (slot.usedBy) return res.status(400).json({ message: 'Code already used; cannot delete' });
    await slot.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
