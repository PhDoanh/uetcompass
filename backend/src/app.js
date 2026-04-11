require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const onboardingRouter = require('./modules/onboarding/onboarding.routes');
const skillTreeRouter = require('./modules/skill-tree/skillTree.routes');
const { academicRouter, trendsRouter, resourcesRouter } = require('./modules/scraping');
const { authRouter } = require('./modules/auth');
const { accountRouter } = require('./modules/account');
const { roadmapRouter } = require('./modules/roadmap/roadmap.routes');
const { registerCronJob } = require('./modules/curriculum/seed.job');
const { registerSigtermHandler } = require('./modules/roadmap/roadmap.triggers');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '200kb';
const LOCALHOST_ORIGIN_PATTERN = /^http:\/\/localhost:\d+$/;


function isAllowedOrigin(origin) {
	if (!origin) {
		return true;
	}

	if (origin === FRONTEND_URL) {
		return true;
	}

	return LOCALHOST_ORIGIN_PATTERN.test(origin);
}

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
			if (isAllowedOrigin(origin)) {
				return callback(null, true);
			}
			return callback(new Error('CORS_ORIGIN_DENIED'));
		},
		credentials: true,
	})
);
app.use(cookieParser());
app.use(express.json());
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
app.use('/api/auth', authRouter);
app.use('/api/roadmaps', roadmapRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/resources', academicRouter);
app.use('/api/market', trendsRouter);

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
registerSigtermHandler();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
