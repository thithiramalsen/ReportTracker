const axios = require('axios');

const enabled = process.env.WHATSAPP_ENABLED === 'true';
const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL; // optional: n8n or custom relay
const defaultSender = process.env.WHATSAPP_SENDER || 'ReportTracker';

async function sendWhatsAppMessage({ to, text, meta }) {
  if (!to) throw new Error('Missing recipient phone');

  if (!enabled) {
    console.log(`[whatsapp] disabled; would send to ${to}: ${text}`);
    return { simulated: true };
  }

  // If a webhook is configured (e.g., a small relay that ties into Twilio/Meta API), forward there; otherwise log as placeholder
  if (webhookUrl) {
    try {
      await axios.post(webhookUrl, { to, text, sender: defaultSender, meta });
    } catch (err) {
      console.error('[whatsapp] webhook send failed', err.message || err.toString());
      throw err;
    }
  } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    // Attempt to send directly via Twilio REST API (no extra dependency)
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+1415xxxx'
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const params = new URLSearchParams();
      params.append('From', from);
      params.append('To', to);
      params.append('Body', text);
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      await axios.post(url, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` } });
    } catch (err) {
      console.error('[whatsapp] twilio send failed', err.message || err.toString());
      throw err;
    }
  } else {
    // no webhook and no Twilio: fallback to console log (development)
    console.log(`[whatsapp] no webhook/twilio configured; message for ${to}: ${text}`);
  }

  return { ok: true };
}

function buildReportText({ report, user }) {
  const date = report.reportDate ? new Date(report.reportDate).toLocaleDateString('en-US') : '';
  const reportName = report.title || 'DRC report';
  const greeting = user?.name ? `Hi ${user.name},` : 'Hi,';
  return `${greeting} a new report "${reportName}" ${date ? `(${date}) ` : ''}is ready.`;
}

async function notifyReportUpload({ report, users }) {
  if (!users || !users.length) return;
  // build absolute download link
  const base = process.env.APP_BASE_URL || process.env.SERVER_URL || process.env.VITE_API_BASE || '';
  const downloadPath = `/api/reports/${report._id}/download`;
  const downloadUrl = base ? `${base.replace(/\/$/, '')}${downloadPath}` : downloadPath;

  const jobs = users
    .filter(u => u && u.phone)
    .map(u => {
      const text = `${buildReportText({ report, user: u })}\n\nOpen: ${downloadUrl}`;
      return sendWhatsAppMessage({
        to: u.phone,
        text,
        meta: { reportId: String(report._id), userId: String(u._id || u.id || ''), downloadUrl }
      })
    });

  try {
    await Promise.all(jobs);
  } catch (err) {
    console.error('[whatsapp] send failed', err.message);
  }
}

module.exports = { notifyReportUpload, sendWhatsAppMessage };
