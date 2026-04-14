const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
	if (transporter) {
		return transporter;
	}

	if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
		return null;
	}

	transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.GMAIL_USER,
			pass: process.env.GMAIL_APP_PASSWORD,
		},
	});

	return transporter;
}

async function safeSendMail(mailOptions) {
	const smtp = getTransporter();
	if (!smtp) {
		return;
	}

	try {
		await smtp.sendMail(mailOptions);
	} catch (err) {
		console.error('[email] Failed to send notification:', err.message);
	}
}

async function sendRoadmapReadyEmail(toEmail, displayName = 'student') {
	return safeSendMail({
		from: `"UETCompass" <${process.env.GMAIL_USER}>`,
		to: toEmail,
		subject: 'Your UETCompass roadmap is ready 🎓',
		text: `Hi ${displayName},\n\nYour personalized learning roadmap is ready. Open UETCompass to explore it.\n\n— UETCompass`,
	});
}

async function sendRoadmapFailedEmail(toEmail, displayName = 'student') {
	return safeSendMail({
		from: `"UETCompass" <${process.env.GMAIL_USER}>`,
		to: toEmail,
		subject: 'Roadmap generation needs a retry',
		text: `Hi ${displayName},\n\nRoadmap generation failed and can be retried from UETCompass.\n\n— UETCompass`,
	});
}

module.exports = {
	sendRoadmapReadyEmail,
	sendRoadmapFailedEmail,
};
