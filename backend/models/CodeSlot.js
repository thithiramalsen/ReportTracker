const mongoose = require('mongoose');

const CodeSlotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    label: { type: String, trim: true },
    role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodeSlot', CodeSlotSchema);
