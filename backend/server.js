const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const codeRoutes = require('./routes/codeRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploads
// Ensure uploads directory exists (prevents ENOENT when saving files to disk)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/codes', codeRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
