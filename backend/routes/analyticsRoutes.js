const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const DailyData = require('../models/DailyData');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Monthly aggregates for a year: returns array of 12 months with totals
router.get('/monthly', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || (new Date()).getFullYear();
    const division = req.query.division;
    const user = req.query.user; // optional createdBy filter
    const userId = user && mongoose.isValidObjectId(user) ? new mongoose.Types.ObjectId(user) : null;
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const match = { date: { $gte: start, $lt: end } };
    if (division) match.division = division;
    if (userId) match.createdBy = userId;

    const pipeline = [
      { $match: match },
        { $group: {
          _id: { month: { $month: '$date' } },
          liters: { $sum: '$liters' },
          dryKilos: { $sum: '$dryKilos' },
          metrolacAvg: { $avg: '$metrolac' },
          nh3Volume: { $sum: '$nh3Volume' },
          tmtDVolume: { $sum: '$tmtDVolume' }
        }},
        { $project: { month: '$_id.month', liters: 1, dryKilos: 1, metrolacAvg: 1, nh3Volume: 1, tmtDVolume: 1, _id: 0 } }
    ];

    const rows = await DailyData.aggregate(pipeline);
    // fill months 1..12
    const result = [];
    for (let m = 1; m <= 12; m++) {
      const r = rows.find(x => x.month === m);
      result.push({ month: m, liters: r ? r.liters : 0, dryKilos: r ? r.dryKilos : 0, metrolacAvg: r ? r.metrolacAvg : null, nh3Volume: r ? r.nh3Volume : 0, tmtDVolume: r ? r.tmtDVolume : 0 });
    }
    res.json({ year, division: division || null, data: result });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Compare month with previous month for totals
router.get('/compare', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || (new Date()).getFullYear();
    const month = parseInt(req.query.month, 10) || ((new Date()).getMonth() + 1);
    const division = req.query.division;
    const user = req.query.user;
    const userId = user && mongoose.isValidObjectId(user) ? new mongoose.Types.ObjectId(user) : null;

    const getRange = (y, m) => {
      const mm = m - 1; // JS Date month index
      const s = new Date(y, mm, 1);
      const e = new Date(y, mm + 1, 1);
      return { start: s, end: e };
    };

    const thisRange = getRange(year, month);
    // previous month
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }
    const prevRange = getRange(prevYear, prevMonth);

    const buildMatch = (range) => {
      const m = { date: { $gte: range.start, $lt: range.end } };
      if (division) m.division = division;
      if (userId) m.createdBy = userId;
      return m;
    };

    const [thisAgg] = await DailyData.aggregate([
      { $match: buildMatch(thisRange) },
      { $group: { _id: null, liters: { $sum: '$liters' }, dryKilos: { $sum: '$dryKilos' }, metrolacAvg: { $avg: '$metrolac' }, nh3Volume: { $sum: '$nh3Volume' }, tmtDVolume: { $sum: '$tmtDVolume' } } },
      { $project: { _id: 0 } }
    ]);

    const [prevAgg] = await DailyData.aggregate([
      { $match: buildMatch(prevRange) },
      { $group: { _id: null, liters: { $sum: '$liters' }, dryKilos: { $sum: '$dryKilos' }, metrolacAvg: { $avg: '$metrolac' }, nh3Volume: { $sum: '$nh3Volume' }, tmtDVolume: { $sum: '$tmtDVolume' } } },
      { $project: { _id: 0 } }
    ]);

    res.json({ month, year, division: division || null, current: thisAgg || { liters:0, dryKilos:0, metrolacAvg: null, nh3Volume:0, tmtDVolume:0 }, previous: prevAgg || { liters:0, dryKilos:0, metrolacAvg: null, nh3Volume:0, tmtDVolume:0 } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Last 12 months totals (rolling)
router.get('/last12', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('GET /analytics/last12', req.query);
    res.set('Cache-Control', 'no-store');
    const division = req.query.division;
    const user = req.query.user;
    const userId = user && mongoose.isValidObjectId(user) ? new mongoose.Types.ObjectId(user) : null;
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
    const match = { date: { $gte: start, $lt: end } };
    if (division) match.division = division;
    if (userId) match.createdBy = userId;

    const rows = await DailyData.aggregate([
      { $match: match },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, liters: { $sum: '$liters' }, dryKilos: { $sum: '$dryKilos' }, metrolacAvg: { $avg: '$metrolac' }, nh3Volume: { $sum: '$nh3Volume' }, tmtDVolume: { $sum: '$tmtDVolume' } } },
      { $project: { year: '$_id.year', month: '$_id.month', liters:1, dryKilos:1, metrolacAvg:1, nh3Volume:1, tmtDVolume:1, _id:0 } },
      { $sort: { year: 1, month: 1 } }
    ]);
    console.log('last12 match', match, 'rows', rows.length);

    // build list of last 12 months
    const out = [];
    const cur = new Date(start);
    for (let i = 0; i < 12; i++) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const r = rows.find(x => x.year === y && x.month === m);
      out.push({ year: y, month: m, liters: r ? r.liters : 0, dryKilos: r ? r.dryKilos : 0, metrolacAvg: r ? r.metrolacAvg : null, nh3Volume: r ? r.nh3Volume : 0, tmtDVolume: r ? r.tmtDVolume : 0 });
      cur.setMonth(cur.getMonth() + 1);
    }

    res.json({ division: division || null, data: out });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

// Daily aggregates between a date range. Query params:
//  - start (ISO date) default: 30 days ago
//  - end (ISO date) default: today
//  - division (optional) to filter
//  - breakdown=1 to return per-day-per-division rows
router.get('/daily', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('GET /analytics/daily', req.query);
    res.set('Cache-Control', 'no-store');
    const { start: s, end: e, division, breakdown, user } = req.query;
    const userId = user && mongoose.isValidObjectId(user) ? new mongoose.Types.ObjectId(user) : null;
    const endDate = e ? new Date(e) : new Date();
    // normalize end to include the full day
    endDate.setHours(23,59,59,999);
    const startDate = s ? new Date(s) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    const match = { date: { $gte: startDate, $lte: endDate } };
    if (division) match.division = division;
    if (userId) match.createdBy = userId;

    if (breakdown && String(breakdown) === '1') {
      // return per-day, per-division rows
      const pipeline = [
        { $match: match },
        { $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' }, division: '$division' },
          liters: { $sum: '$liters' },
          dryKilos: { $sum: '$dryKilos' },
          metrolacAvg: { $avg: '$metrolac' },
          nh3Volume: { $sum: '$nh3Volume' },
          tmtDVolume: { $sum: '$tmtDVolume' }
          }},
          { $project: { date: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: '$_id.day' } }, division: '$_id.division', liters:1, dryKilos:1, metrolacAvg:1, nh3Volume:1, tmtDVolume:1, _id:0 } },
        { $sort: { date: 1, division: 1 } }
      ];
      const rows = await DailyData.aggregate(pipeline);
      console.log('daily breakdown match', match, 'rows', rows.length);
      return res.json({ start: startDate, end: endDate, breakdown: true, data: rows });
    }

    // default: aggregate per day (totals across divisions unless filtered)
    const pipeline = [
      { $match: match },
        { $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } },
          liters: { $sum: '$liters' },
          dryKilos: { $sum: '$dryKilos' },
          metrolacAvg: { $avg: '$metrolac' },
          nh3Volume: { $sum: '$nh3Volume' },
          tmtDVolume: { $sum: '$tmtDVolume' }
        }},
        { $project: { date: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: '$_id.day' } }, liters:1, dryKilos:1, metrolacAvg:1, nh3Volume:1, tmtDVolume:1, _id:0 } },
      { $sort: { date: 1 } }
    ];

    const rows = await DailyData.aggregate(pipeline);
    console.log('daily total match', match, 'rows', rows.length);
    res.json({ start: startDate, end: endDate, breakdown: false, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Aggregate totals grouped by user (createdBy) in a date range
router.get('/by-user', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { start: s, end: e, division } = req.query;
    const endDate = e ? new Date(e) : new Date();
    endDate.setHours(23,59,59,999);
    const startDate = s ? new Date(s) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    const match = { date: { $gte: startDate, $lte: endDate } };
    if (division) match.division = division;

    const rows = await DailyData.aggregate([
      { $match: match },
      { $group: { _id: '$createdBy', liters: { $sum: '$liters' }, dryKilos: { $sum: '$dryKilos' }, metrolacAvg: { $avg: '$metrolac' }, nh3Volume: { $sum: '$nh3Volume' }, tmtDVolume: { $sum: '$tmtDVolume' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', name: '$user.name', code: '$user.code', liters:1, dryKilos:1, metrolacAvg:1, nh3Volume:1, tmtDVolume:1, _id:0 } },
      { $sort: { liters: -1 } }
    ]);

    res.json({ start: startDate, end: endDate, division: division || null, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

