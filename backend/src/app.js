require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const onboardingRouter = require('./modules/onboarding/onboarding.routes');
const skillTreeRouter = require('./modules/skill-tree/skillTree.routes');
const { authRoutes } = require('./modules/auth');
const { registerCronJob } = require('./modules/curriculum/seed.job');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '200kb';

function safeErrorMessage(err) {
	if (!err || typeof err.message !== 'string') {
		return 'Unknown error';
	}
	return err.message.slice(0, 300);
}

app.use(helmet());
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || origin === FRONTEND_URL) {
				return callback(null, true);
			}
			return callback(new Error('CORS_ORIGIN_DENIED'));
		},
		credentials: true,
	})
);
app.use(cookieParser());
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Database connection
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uetcompass';
mongoose.connect(MONGODB_URI)
	.then(() => console.log('Connected to MongoDB'))
	.catch(err => console.error('MongoDB connection error:', safeErrorMessage(err)));

app.get('/health', (req, res) => {
	res.status(200).json({ ok: true });
});

app.use('/api/onboarding', onboardingRouter);
app.use('/api/skill-tree', skillTreeRouter);
app.use('/api', authRoutes);

app.use((err, req, res, next) => {
	const status = err?.status || 500;
	const code = err?.code || 'INTERNAL_ERROR';
	const message = err?.message === 'CORS_ORIGIN_DENIED' ? 'Origin not allowed.' : err?.message || 'Unexpected server error';
	if (status >= 500) {
		console.error('[api:error]', { code, message: safeErrorMessage(err) });
	}
	res.status(status).json({ error: { code, message } });
});

registerCronJob();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
