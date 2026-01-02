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
const notificationRoutes = require('./routes/notificationRoutes');
const notifyJobsRoutes = require('./routes/notifyJobs');
const notifylk = require('./utils/notifylk');

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/notify', notifyJobsRoutes);

// Root route: helpful landing or redirect to frontend app
app.get('/', (req, res) => {
  const frontend = process.env.APP_BASE_URL;
  if (frontend) {
    // ensure the frontend URL includes a scheme, otherwise redirect() treats it as a relative path
    const hasScheme = /^https?:\/\//i.test(frontend);
    const redirectTo = hasScheme ? frontend : `https://${frontend}`;
    return res.redirect(redirectTo);
  }
  res.send(`
    <html>
      <head><title>ReportTracker API</title></head>
      <body style="font-family: Arial, sans-serif; padding: 2rem;">
        <h1>ReportTracker API</h1>
        <p>This service hosts the ReportTracker backend API.</p>
        <p>Health: <a href="/api/health">/api/health</a></p>
      </body>
    </html>
  `);
});

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
    // Start background processor for pending SMS jobs
    try {
      const intervalMs = parseInt(process.env.NOTIFYLK_PROCESS_INTERVAL_MS || '60000', 10);
      setInterval(() => {
        notifylk.processPendingJobs().catch(e => console.error('notifylk background error', e && e.message ? e.message : e));
      }, intervalMs);
      console.log('Started notifylk background processor, intervalMs=', process.env.NOTIFYLK_PROCESS_INTERVAL_MS || 60000);
    } catch (e) { console.error('Failed to start notifylk processor', e.message || e); }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
