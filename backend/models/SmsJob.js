const mongoose = require('mongoose');

const SmsJobSchema = new mongoose.Schema({
  to: { type: String, required: true },
  message: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.Mixed },
  contact: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending','sent','failed','resolved'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  lastTriedAt: { type: Date },
  providerResponse: { type: mongoose.Schema.Types.Mixed },
  providerMessageId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SmsJob', SmsJobSchema);
