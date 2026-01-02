const axios = require('axios');

const enabled = process.env.NOTIFYLK_ENABLED === 'true';
const userId = process.env.NOTIFYLK_USER_ID;
const apiKey = process.env.NOTIFYLK_API_KEY;
const senderId = process.env.NOTIFYLK_SENDER_ID || 'NotifyDEMO';
const SmsJob = require('../models/SmsJob');
const MAX_ATTEMPTS = parseInt(process.env.NOTIFYLK_MAX_ATTEMPTS || '5', 10);

function normalizePhoneForNotifyLK(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // Remove plus and non-digits
  s = s.replace(/[^0-9]/g, '');
  // If starts with 0, replace with 94 (Sri Lanka domestic)
  if (s.startsWith('0')) s = '94' + s.slice(1);
  // If starts with 94 already or other country code, keep as-is
  return s;
}

async function sendSms({ to, message, contact }) {
  if (!to) throw new Error('Missing recipient phone');
  if (!enabled) {
    console.log(`[notifylk] disabled; would send to ${to}: ${message}`);
    return { simulated: true };
  }

  if (!userId || !apiKey) throw new Error('Missing NOTIFYLK credentials (NOTIFYLK_USER_ID / NOTIFYLK_API_KEY)');

  const url = 'https://app.notify.lk/api/v1/send';
  const params = {
    user_id: userId,
    api_key: apiKey,
    sender_id: senderId,
    to,
    message
  };

  if (contact) {
    if (contact.firstName) params.contact_fname = contact.firstName;
    if (contact.lastName) params.contact_lname = contact.lastName;
    if (contact.email) params.contact_email = contact.email;
    if (contact.address) params.contact_address = contact.address;
  }

  try {
    const resp = await axios.get(url, { params });
    return resp.data;
  } catch (err) {
    console.error('[notifylk] send failed', err.message || err.toString());
    throw err;
  }
}

// Create a persisted job for sending SMS. Useful for retries and admin visibility.
async function enqueueSmsJob({ to, message, contact, meta }) {
  if (!to) throw new Error('Missing recipient phone');
  const job = new SmsJob({ to, message, contact, meta, status: 'pending', attempts: 0 });
  await job.save();
  return job;
}

// Attempt to process a single job (one-off). Returns job after update.
async function processJob(job) {
  if (!job || job.status === 'sent' || job.status === 'resolved') return job;
  try {
    const resp = await sendSms({ to: job.to, message: job.message, contact: job.contact });
    job.attempts = (job.attempts || 0) + 1;
    job.status = 'sent';
    job.lastTriedAt = new Date();
    job.lastError = undefined;
    job.providerResponse = resp;
    // Try to capture common provider id fields
    if (resp) {
      if (resp.sid) job.providerMessageId = resp.sid;
      else if (resp.data && resp.data.message_id) job.providerMessageId = resp.data.message_id;
      else if (resp.message_id) job.providerMessageId = resp.message_id;
      else if (resp.data && resp.data.data) {
        // notify.lk returns { status: 'success', data: 'Sent' } - no id
      }
    }
    await job.save();
    return job;
  } catch (err) {
    job.attempts = (job.attempts || 0) + 1;
    job.lastTriedAt = new Date();
    job.lastError = err && err.message ? err.message : String(err);
    job.status = job.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
    await job.save();
    return job;
  }
}

// Process pending jobs in batch (limit configurable)
async function processPendingJobs(limit = 10) {
  const q = { status: { $in: ['pending','failed'] }, attempts: { $lt: MAX_ATTEMPTS } };
  const jobs = await SmsJob.find(q).sort({ createdAt: 1 }).limit(limit);
  for (const j of jobs) {
    try { await processJob(j); } catch(e) { console.error('processJob failed', e.message || e); }
  }
}

async function notifyReportUpload({ report, users }) {
  if (!users || !users.length) return;

  const base = process.env.APP_BASE_URL || process.env.SERVER_URL || process.env.VITE_API_BASE || '';
  const downloadPath = `/api/reports/${report._id}/download`;
  const downloadUrl = base ? `${base.replace(/\/$/, '')}${downloadPath}` : downloadPath;

  // enqueue jobs for persistence and retries
  const created = [];
  for (const u of users.filter(u=>u && u.phone)) {
    const to = normalizePhoneForNotifyLK(u.phone);
    const name = u.name || '';
    const text = `${name ? `Hi ${name}, ` : 'Hi, '}a new report "${report.title || 'report'}" is ready. Open: ${downloadUrl}`;
    const contact = { firstName: u.name || '', email: u.email || '' };
    try {
      const job = await enqueueSmsJob({ to, message: text, contact, meta: { reportId: String(report._id) } });
      created.push(job);
    } catch (err) { console.error('[notifylk] enqueue failed', err && err.message ? err.message : err); }
  }

  // trigger immediate processing in background (non-blocking)
  processPendingJobs().catch(e => console.error('[notifylk] background process failed', e && e.message ? e.message : e));
  return created;
}

module.exports = { sendSms, notifyReportUpload, enqueueSmsJob, processPendingJobs, processJob };
