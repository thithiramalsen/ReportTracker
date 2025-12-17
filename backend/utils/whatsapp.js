const axios = require('axios');

const enabled = process.env.WHATSAPP_ENABLED === 'true';
const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL; // optional: n8n or custom relay
const defaultSender = process.env.WHATSAPP_SENDER || 'ReportTracker';

async function sendWhatsAppMessage({ to, text, meta }) {
  if (!enabled) {
    console.log(`[whatsapp] disabled; would send to ${to}: ${text}`);
    return { simulated: true };
  }

  if (!to) throw new Error('Missing recipient phone');

  // If a webhook is configured (e.g., n8n), forward there; otherwise log as placeholder
  if (webhookUrl) {
    await axios.post(webhookUrl, { to, text, sender: defaultSender, meta });
  } else {
    console.log(`[whatsapp] no webhook configured; message for ${to}: ${text}`);
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
  const jobs = users
    .filter(u => u && u.phone)
    .map(u => sendWhatsAppMessage({
      to: u.phone,
      text: buildReportText({ report, user: u }),
      meta: { reportId: String(report._id), userId: String(u._id || u.id || '') }
    }));

  try {
    await Promise.all(jobs);
  } catch (err) {
    console.error('[whatsapp] send failed', err.message);
  }
}

module.exports = { notifyReportUpload, sendWhatsAppMessage };
