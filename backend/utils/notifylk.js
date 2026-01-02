const axios = require('axios');

const enabled = process.env.NOTIFYLK_ENABLED === 'true';
const userId = process.env.NOTIFYLK_USER_ID;
const apiKey = process.env.NOTIFYLK_API_KEY;
const senderId = process.env.NOTIFYLK_SENDER_ID || 'NotifyDEMO';

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

async function notifyReportUpload({ report, users }) {
  if (!users || !users.length) return;

  const base = process.env.APP_BASE_URL || process.env.SERVER_URL || process.env.VITE_API_BASE || '';
  const downloadPath = `/api/reports/${report._id}/download`;
  const downloadUrl = base ? `${base.replace(/\/$/, '')}${downloadPath}` : downloadPath;

  const jobs = users
    .filter(u => u && u.phone)
    .map(u => {
      const to = normalizePhoneForNotifyLK(u.phone);
      const name = u.name || '';
      const text = `${name ? `Hi ${name}, ` : 'Hi, '}a new report "${report.title || 'report'}" is ready. Open: ${downloadUrl}`;
      const contact = { firstName: u.name || '', email: u.email || '' };
      return sendSms({ to, message: text, contact }).catch(err => {
        console.error('[notifylk] individual send failed', err.message || err.toString());
      });
    });

  try {
    await Promise.all(jobs);
  } catch (e) {
    console.error('[notifylk] some sends failed', e && e.message ? e.message : e);
  }
}

module.exports = { sendSms, notifyReportUpload };
