// Simple test script to send a Notify.lk SMS or run notifyReportUpload
require('dotenv').config();
const { sendSms, notifyReportUpload } = require('../utils/notifylk');

async function run() {
  const mode = process.argv[2] || 'single';
  if (mode === 'single') {
    const to = process.argv[3] || process.env.TEST_PHONE;
    if (!to) {
      console.error('Usage: node sendNotifyTest.js single <phone>');
      process.exit(1);
    }
    try {
      const res = await sendSms({ to, message: 'Test message from ReportTracker via Notify.lk' });
      console.log('sendSms result:', res);
    } catch (e) {
      console.error('sendSms failed', e.message || e);
    }
  } else if (mode === 'bulk') {
    const report = { _id: 'TESTREPORT123', title: 'Sample Test Report' };
    const users = [
      { name: 'Test User', phone: process.env.TEST_PHONE || '', email: 'test@example.com' }
    ];
    try {
      await notifyReportUpload({ report, users });
      console.log('notifyReportUpload invoked');
    } catch (e) {
      console.error('notifyReportUpload failed', e.message || e);
    }
  } else {
    console.error('Unknown mode:', mode);
  }
}

run();
