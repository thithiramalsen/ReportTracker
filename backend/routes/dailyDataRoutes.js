const express = require('express');
const router = express.Router();
const DailyData = require('../models/DailyData');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Admin: list entries (optional query: year, month, division)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { year, month, division } = req.query;
    const filter = {};
    if (division) filter.division = String(division).trim();
    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        const start = new Date(y, 0, 1);
        const end = new Date(y + 1, 0, 1);
        filter.date = { $gte: start, $lt: end };
      }
    }
    if (month && year) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1; // month from 1..12
      if (!isNaN(y) && !isNaN(m)) {
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 1);
        filter.date = { $gte: start, $lt: end };
      }
    }

    const results = await DailyData.find(filter).sort({ date: -1 }).populate('createdBy', 'name code');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: create
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { date, liters, dryKilos, metrolac, division } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    const entry = new DailyData({ date: new Date(date), liters: Number(liters || 0), dryKilos: Number(dryKilos || 0), metrolac: Number(metrolac || 0), division: division || '', createdBy: req.user.id });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: get by id
router.get('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const entry = await DailyData.findById(req.params.id).populate('createdBy', 'name code');
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: update
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const updates = {};
    const { date, liters, dryKilos, metrolac, division } = req.body;
    if (date) updates.date = new Date(date);
    if (liters !== undefined) updates.liters = Number(liters);
    if (dryKilos !== undefined) updates.dryKilos = Number(dryKilos);
    if (metrolac !== undefined) updates.metrolac = Number(metrolac);
    if (division !== undefined) updates.division = division;
    const entry = await DailyData.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: delete
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const entry = await DailyData.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    await entry.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
