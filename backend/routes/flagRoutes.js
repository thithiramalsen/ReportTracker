const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FlaggedDailyData = require('../models/FlaggedDailyData');
const DailyData = require('../models/DailyData');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

function slipFileFilter(req, file, cb) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images (jpg/png/webp) or PDF are allowed as slip'));
}

const upload = multer({ storage, fileFilter: slipFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/flags - create a flag for a daily data entry (user action)
router.post('/', verifyToken, upload.single('slip'), async (req, res) => {
  try {
    const { dailyDataId, liters, dryKilos, metrolac, nh3Volume, tmtDVolume, remarkText, remarkTags } = req.body;
    if (!dailyDataId) return res.status(400).json({ message: 'dailyDataId is required' });
    const daily = await DailyData.findById(dailyDataId).populate('createdBy', 'name code');
    if (!daily) return res.status(404).json({ message: 'Daily data not found' });

    // users can only flag entries for their division
    if (req.user.role !== 'admin') {
      const userCode = req.user.code || '';
      if (!userCode || String(userCode).trim() !== String(daily.division).trim()) {
        return res.status(403).json({ message: 'Not authorized to flag this record' });
      }
    }

    const userProposedData = {};
    if (liters !== undefined) userProposedData.liters = Number(liters);
    if (dryKilos !== undefined) userProposedData.dryKilos = Number(dryKilos);
    if (metrolac !== undefined) userProposedData.metrolac = Number(metrolac);
    if (nh3Volume !== undefined) userProposedData.nh3Volume = Number(nh3Volume);
    if (tmtDVolume !== undefined) userProposedData.tmtDVolume = Number(tmtDVolume);

    if (Object.keys(userProposedData).length === 0) return res.status(400).json({ message: 'No proposed data provided' });

    let slipUrl = '';
    if (req.file && req.file.filename) slipUrl = '/uploads/' + req.file.filename;

    let tags = [];
    if (remarkTags) {
      try { tags = typeof remarkTags === 'string' ? JSON.parse(remarkTags) : remarkTags; } catch (e) { tags = String(remarkTags).split(',').map(s=>s.trim()).filter(Boolean); }
    }

    const flag = new FlaggedDailyData({
      dailyDataId: daily._id,
      adminData: {
        date: daily.date,
        liters: daily.liters,
        dryKilos: daily.dryKilos,
        metrolac: daily.metrolac,
        nh3Volume: daily.nh3Volume,
        tmtDVolume: daily.tmtDVolume,
        division: daily.division,
        supplierCode: daily.supplierCode
      },
      userProposedData,
      userId: req.user.id,
      remarkText: remarkText || '',
      remarkTags: tags,
      slipUrl
    });
    await flag.save();

    // Notify admins with friendly message (include division and date)
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins && admins.length) {
        const friendly = `${daily.division || 'Division'} on ${daily.date ? new Date(daily.date).toLocaleDateString() : ''}`;
        const notifs = admins.map(a => ({ userId: a._id, type: 'flagged_daily', message: `Flag raised for ${friendly}`, data: { flagId: flag._id, dailyDataId: daily._id } }));
        await Notification.insertMany(notifs);
        try { const notifier = require('../utils/notifier'); notifs.forEach(n => notifier.sendEvent('notification', n)); } catch (e) { }
      }
    } catch (e) { console.error('Failed to notify admins of flag', e && e.message); }

    res.status(201).json({ message: 'Flag created', flag });
  } catch (err) {
    console.error('[FLAGS][POST] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/flags - admin: list all flags; user: list their flags
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const flags = await FlaggedDailyData.find().sort({ createdAt: -1 }).populate('userId', 'name code').populate('dailyDataId');
      return res.json(flags);
    }
    const flags = await FlaggedDailyData.find({ userId: req.user.id }).sort({ createdAt: -1 }).populate('dailyDataId');
    res.json(flags);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/flags/:id - admin or owner
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const flag = await FlaggedDailyData.findById(req.params.id).populate('userId', 'name code').populate('dailyDataId');
    if (!flag) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'admin' && String(flag.userId._id) !== String(req.user.id)) return res.status(403).json({ message: 'Not authorized' });
    res.json(flag);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/flags/:id - owner can update their flag (edit proposed data or replace slip)
router.patch('/:id', verifyToken, upload.single('slip'), async (req, res) => {
  try {
    const flag = await FlaggedDailyData.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: 'Not found' });
    if (String(flag.userId) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });

    // Owners may edit only while flag is open or revived. After admin accepts or discards, owner edits are not allowed.
    if (req.user.role !== 'admin' && ['accepted', 'discarded'].includes(flag.status)) {
      return res.status(403).json({ message: 'Cannot edit flag after it has been accepted or discarded by admin' });
    }

    // allow updating proposed numeric fields and remarks
    const { liters, dryKilos, metrolac, nh3Volume, tmtDVolume, remarkText, remarkTags } = req.body;
    const p = flag.userProposedData || {};
    if (liters !== undefined) p.liters = Number(liters);
    if (dryKilos !== undefined) p.dryKilos = Number(dryKilos);
    if (metrolac !== undefined) p.metrolac = Number(metrolac);
    if (nh3Volume !== undefined) p.nh3Volume = Number(nh3Volume);
    if (tmtDVolume !== undefined) p.tmtDVolume = Number(tmtDVolume);
    flag.userProposedData = p;
    if (remarkText !== undefined) flag.remarkText = remarkText;
    if (remarkTags !== undefined) {
      try { flag.remarkTags = typeof remarkTags === 'string' ? JSON.parse(remarkTags) : remarkTags; } catch (e) { flag.remarkTags = String(remarkTags).split(',').map(s=>s.trim()).filter(Boolean); }
    }

    if (req.file && req.file.filename) {
      // replace slipUrl
      flag.slipUrl = '/uploads/' + req.file.filename;
    }

    // Do not auto-change status here; admins control accept/discard/revive. If admin revived the flag, status may be 'revived' and edits are allowed.

    await flag.save();
    res.json({ message: 'Flag updated', flag });
  } catch (err) {
    console.error('[FLAGS][PATCH] error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/flags/:id/accept - admin commits user's data into DailyData
router.patch('/:id/accept', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const flag = await FlaggedDailyData.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: 'Not found' });
    if (flag.status === 'accepted') return res.status(400).json({ message: 'Already accepted' });

    const updates = {};
    const p = flag.userProposedData || {};
    if (p.date !== undefined) updates.date = p.date;
    if (p.liters !== undefined) updates.liters = p.liters;
    if (p.dryKilos !== undefined) updates.dryKilos = p.dryKilos;
    if (p.metrolac !== undefined) updates.metrolac = p.metrolac;
    if (p.nh3Volume !== undefined) updates.nh3Volume = p.nh3Volume;
    if (p.tmtDVolume !== undefined) updates.tmtDVolume = p.tmtDVolume;

    await DailyData.findByIdAndUpdate(flag.dailyDataId, updates);
    flag.status = 'accepted';
    flag.actedBy = req.user.id;
    flag.actionAt = new Date();
    await flag.save();

    // notify owner
    try {
      const friendly = `${flag.adminData?.division || 'Division'} on ${flag.adminData?.date ? new Date(flag.adminData.date).toLocaleDateString() : ''}`;
      await Notification.create({ userId: flag.userId, type: 'flag_accepted', message: `Your flag for ${friendly} was accepted`, data: { flagId: flag._id, dailyDataId: flag.dailyDataId } });
    } catch (e) { console.error('Failed to notify user of acceptance', e && e.message); }

    res.json({ message: 'Flag accepted and daily data updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/flags/:id/discard - admin discards a flag (record remains unchanged)
router.patch('/:id/discard', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const flag = await FlaggedDailyData.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: 'Not found' });
    // restore the original admin data snapshot to the DailyData record
    try {
      const admin = flag.adminData || {};
      const updates = {};
      if (admin.date !== undefined) updates.date = admin.date;
      if (admin.liters !== undefined) updates.liters = admin.liters;
      if (admin.dryKilos !== undefined) updates.dryKilos = admin.dryKilos;
      if (admin.metrolac !== undefined) updates.metrolac = admin.metrolac;
      if (admin.nh3Volume !== undefined) updates.nh3Volume = admin.nh3Volume;
      if (admin.tmtDVolume !== undefined) updates.tmtDVolume = admin.tmtDVolume;
      if (admin.division !== undefined) updates.division = admin.division;
      if (admin.supplierCode !== undefined) updates.supplierCode = admin.supplierCode;
      if (Object.keys(updates).length) {
        await DailyData.findByIdAndUpdate(flag.dailyDataId, updates);
      }
    } catch (e) {
      console.error('Failed to restore admin data on discard', e && e.message);
    }

    flag.status = 'discarded';
    flag.actedBy = req.user.id;
    flag.actionAt = new Date();
    await flag.save();
    try {
      const friendly = `${flag.adminData?.division || 'Division'} on ${flag.adminData?.date ? new Date(flag.adminData.date).toLocaleDateString() : ''}`;
      await Notification.create({ userId: flag.userId, type: 'flag_discarded', message: `Your flag for ${friendly} was discarded by admin and the record was restored`, data: { flagId: flag._id, dailyDataId: flag.dailyDataId } });
    } catch (e) { console.error('Failed to notify user of discard', e && e.message); }
    res.json({ message: 'Flag discarded and record restored' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/flags/:id/revive - admin revives a discarded flag
router.patch('/:id/revive', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const flag = await FlaggedDailyData.findById(req.params.id);
    if (!flag) return res.status(404).json({ message: 'Not found' });
    flag.status = 'revived';
    flag.actedBy = req.user.id;
    flag.actionAt = new Date();
    await flag.save();
    try {
      const friendly = `${flag.adminData?.division || 'Division'} on ${flag.adminData?.date ? new Date(flag.adminData.date).toLocaleDateString() : ''}`;
      await Notification.create({ userId: flag.userId, type: 'flag_revived', message: `Your flag for ${friendly} was revived by admin`, data: { flagId: flag._id, dailyDataId: flag.dailyDataId } });
    } catch (e) { console.error('Failed to notify user of revive', e && e.message); }
    res.json({ message: 'Flag revived' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
