// Usage: node sendNotifyTest.js 9471XXXXXXX
// Load environment variables from .env when running the script directly (only for local/dev)
const fs = require('fs');
const path = require('path');
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try { require('dotenv').config({ path: envPath }); console.log('[sendNotifyTest] loaded .env'); } catch(e) { console.warn('[sendNotifyTest] dotenv load failed', e.message); }
  } else {
    console.log('[sendNotifyTest] .env not found; relying on process.env');
  }
}
const { notifyReportUpload, sendSms } = require('../utils/notifylk');
const argv = process.argv.slice(2);
console.log('[sendNotifyTest] NOTIFYLK_ENABLED=', process.env.NOTIFYLK_ENABLED);
if (!argv[0]) {
  console.error('Usage: node sendNotifyTest.js 9471XXXXXXX [--mode=test|notify|both]');
  process.exit(2);
}
const to = argv[0];
// default mode: 'notify' (only the report notification). Other modes: 'test' (only plain test SMS), 'both'
let mode = 'notify';
const modeArg = argv.find(a => a.startsWith('--mode='));
if (modeArg) mode = modeArg.split('=')[1] || mode;

async function run() {
  try {
    if (mode === 'test' || mode === 'both') {
      // small test using direct sendSms
      const res = await sendSms({ to, message: `Test message from ReportTracker at ${new Date().toLocaleString()}` });
      console.log('sendSms result:', res);
    }

    if (mode === 'notify' || mode === 'both') {
      // test notifyReportUpload flow (report-style message)
      await notifyReportUpload({ report: { _id: 'test-report-000', title: 'Test Report' }, users: [{ name: 'Test User', phone: to, email: 'test@example.com' }] });
      console.log('notifyReportUpload executed (check logs or messages)');
    }
  } catch (err) {
    console.error('send failed', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

run();
