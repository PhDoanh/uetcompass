const nodemailer = require('nodemailer');

function buildTransporter() {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: { user, pass },
  });
}

async function sendMailSafe({ to, subject, text, html }) {
  const transporter = buildTransporter();
  if (!transporter) {
    console.warn('[auth:email:skip] mail transporter not configured');
    return;
  }

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}

async function sendRegistrationOtpEmail(email, otp) {
  await sendMailSafe({
    to: email,
    subject: 'UETCompass - Verify your account',
    text: `Your verification code is ${otp}. It expires in 2 minutes.`,
    html: `<p>Your verification code is <b>${otp}</b>. It expires in 2 minutes.</p>`,
  });
}

async function sendResetOtpEmail(email, otp) {
  await sendMailSafe({
    to: email,
    subject: 'UETCompass - Password reset code',
    text: `Your password reset code is ${otp}. It expires in 2 minutes.`,
    html: `<p>Your password reset code is <b>${otp}</b>. It expires in 2 minutes.</p>`,
  });
}

module.exports = {
  sendRegistrationOtpEmail,
  sendResetOtpEmail,
};
