const express = require('express');
const router = express.Router();
const DailyData = require('../models/DailyData');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Admin: list entries (optional query: year, month, division)
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

// Users: list their own entries
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const results = await DailyData.find({ createdBy: req.user.id }).sort({ date: -1 }).populate('createdBy', 'name code');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create: admins and regular users can create entries
router.post('/', verifyToken, async (req, res) => {
  try {
    const { date, liters, dryKilos, metrolac, division, supplierCode, nh3Volume, tmtDVolume } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    // Determine creator and default division for regular users
    let entryDivision = '';
    let createdBy = req.user.id;
    if (req.user && req.user.role === 'admin') {
      entryDivision = division || '';
      // allow admins to set createdBy if provided
      if (req.body.createdBy) createdBy = req.body.createdBy;
    } else {
      // regular users: default division to their user.code if available
      entryDivision = req.user.code || division || '';
    }

    const entry = new DailyData({
      date: new Date(date),
      liters: Number(liters || 0),
      dryKilos: Number(dryKilos || 0),
      metrolac: Number(metrolac || 0),
      division: entryDivision,
      supplierCode: supplierCode || '',
      nh3Volume: Number(nh3Volume || 0),
      tmtDVolume: Number(tmtDVolume || 0),
      createdBy
    });
    await entry.save();
    const saved = await DailyData.findById(entry._id).populate('createdBy', 'name code');
    res.status(201).json(saved);
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
    const { date, liters, dryKilos, metrolac, division, supplierCode, nh3Volume, tmtDVolume } = req.body;
    if (date) updates.date = new Date(date);
    if (liters !== undefined) updates.liters = Number(liters);
    if (dryKilos !== undefined) updates.dryKilos = Number(dryKilos);
    if (metrolac !== undefined) updates.metrolac = Number(metrolac);
    if (division !== undefined) updates.division = division;
    if (supplierCode !== undefined) updates.supplierCode = supplierCode;
    if (nh3Volume !== undefined) updates.nh3Volume = Number(nh3Volume);
    if (tmtDVolume !== undefined) updates.tmtDVolume = Number(tmtDVolume);
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
