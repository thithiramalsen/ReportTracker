const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    reportDate: { type: Date, required: true },
    fileUrl: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
