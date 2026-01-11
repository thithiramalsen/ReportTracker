const mongoose = require('mongoose');

const DailyDataSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    liters: { type: Number, default: 0 },
    dryKilos: { type: Number, default: 0 },
    metrolac: { type: Number, default: 0 },
    supplierCode: { type: String, trim: true },
    nh3Volume: { type: Number, default: 0 },
    tmtDVolume: { type: Number, default: 0 },
    division: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyData', DailyDataSchema);
