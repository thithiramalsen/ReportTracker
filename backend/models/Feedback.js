const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: false },
  senderName: { type: String },
  senderEmail: { type: String },
  message: { type: String, required: true },
  type: { type: String, enum: ['feedback','comment','bug','other'], default: 'feedback' },
  status: { type: String, enum: ['open','closed'], default: 'open' },
  response: {
    text: { type: String },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
