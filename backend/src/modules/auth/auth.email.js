const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function buildEmailError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) {
    err.details = details;
  }
  return err;
}

function getBrevoConfig() {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || '').trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || '').trim();

  if (!apiKey || !senderName || !senderEmail) {
    throw buildEmailError(
      503,
      'EMAIL_PROVIDER_NOT_CONFIGURED',
      'Email provider is not configured. Please set BREVO_API_KEY, BREVO_SENDER_NAME, and BREVO_SENDER_EMAIL.'
    );
  }

  return { apiKey, senderName, senderEmail };
}

async function sendMailSafe({ to, subject, text, html }) {
  const { apiKey, senderName, senderEmail } = getBrevoConfig();

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw buildEmailError(502, 'EMAIL_PROVIDER_ERROR', 'Failed to deliver email.', {
      provider: 'brevo',
      status: response.status,
      body,
    });
  }
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
