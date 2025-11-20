const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html }) {
  // Use SMTP settings from env when available. If not, create a test account (Ethereal)
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  let transporter;
  let usedTestAccount = false;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT) : 587,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  } else {
    // Create a test account (Ethereal) for development if no SMTP configured
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    usedTestAccount = true;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || (SMTP_USER || 'no-reply@example.com'),
    to,
    subject,
    text,
    html
  });

  // If using Ethereal (test account), attach preview URL
  if (usedTestAccount) {
    info.previewUrl = nodemailer.getTestMessageUrl(info);
  }

  return info;
}

module.exports = { sendEmail };
