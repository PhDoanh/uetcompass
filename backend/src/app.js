require('dotenv').config();
const express = require('express');
const cors = require('cors');
const onboardingRouter = require('./modules/onboarding/onboarding.routes');
const skillTreeRouter = require('./modules/skill-tree/skillTree.routes');
const { registerCronJob } = require('./modules/curriculum/seed.job');
const { singleRouter: roadmapSingleRouter, roadmapRouter } = require('./modules/roadmap/roadmap.routes');
const { triggerGeneration, isGenerating, __handleSigterm } = require('./modules/roadmap/generation.service');

const app = express();

app.use(cors());
app.use(express.json());

// Database connection
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uetcompass';
mongoose.connect(MONGODB_URI)
	.then(() => console.log('Connected to MongoDB'))
	.catch(err => console.error('MongoDB connection error:', err));

app.get('/health', (req, res) => {
	res.status(200).json({ ok: true });
});

app.use('/api/onboarding', onboardingRouter);
app.use('/api/skill-tree', skillTreeRouter);
app.use('/api', roadmapSingleRouter);
app.use('/api/roadmaps', roadmapRouter);

app.use((err, req, res, next) => {
	const status = err?.status || 500;
	const code = err?.code || 'INTERNAL_ERROR';
	const message = err?.message || 'Unexpected server error';
	res.status(status).json({ error: { code, message } });
});

registerCronJob();

// Feature 009: SIGTERM handler — surface failures for any pending previews before exit
process.on('SIGTERM', async () => {
	console.log('[app] SIGTERM received — flushing roadmap preview state');
	await __handleSigterm();
	process.exit(0);
});

// Feature 009: Internal trigger — profile submission event
// Called by Feature 001 onboarding service after profile is committed.
// Exported so Feature 001 can invoke it directly within the same process.
function onProfileSubmitted(userId, studentProfileId) {
	if (isGenerating(userId)) {
		console.warn('[app] Generation already active for user — skipping profile_submission trigger', { userId });
		return;
	}
	triggerGeneration(userId, studentProfileId, 'profile_submission').catch((err) => {
		if (err.code !== 'CONFLICT') {
			console.error('[app] Unexpected error triggering generation on profile submission:', err);
		}
	});
}

// Feature 009: Internal trigger — repersonalization event (US4)
// Called by Feature 005 after setting repersonalizationPending: true on StudentProfile.
// Debounces if initial generation is still in progress.
function onRepersonalizationPending(userId, studentProfileId) {
	if (isGenerating(userId)) {
		console.warn('[app] Generation already active for user — debouncing repersonalization trigger', { userId });
		return;
	}
	triggerGeneration(userId, studentProfileId, 'repersonalization').catch((err) => {
		if (err.code !== 'CONFLICT') {
			console.error('[app] Unexpected error triggering generation on repersonalization:', err);
		}
	});
}

module.exports.onProfileSubmitted = onProfileSubmitted;
module.exports.onRepersonalizationPending = onRepersonalizationPending;

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
app.onProfileSubmitted = onProfileSubmitted;
app.onRepersonalizationPending = onRepersonalizationPending;
