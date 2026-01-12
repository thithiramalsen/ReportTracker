const mongoose = require('mongoose');

const FlaggedDailyDataSchema = new mongoose.Schema(
  {
    dailyDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyData', required: true },
    adminData: { type: Object }, // snapshot of admin-entered values
    userProposedData: { type: Object, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarkText: { type: String },
    remarkTags: [{ type: String }],
    slipUrl: { type: String }, // path to uploaded proof (image/pdf)
    status: { type: String, enum: ['open', 'accepted', 'discarded', 'revived'], default: 'open' },
    actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlaggedDailyData', FlaggedDailyDataSchema);
