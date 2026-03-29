require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./lib/db');
const taggingRouter = require('./modules/tagging/tagging.routes');
const taggingWorker = require('./modules/tagging/tagging.worker');
const onboardingRouter = require('./modules/onboarding/onboarding.routes');
const skillTreeRouter = require('./modules/skill-tree/skillTree.routes');
const { roadmapRouter } = require('./modules/roadmap/roadmap.routes');
const searchRouter = require('./modules/search/search.routes');
const { registerCronJob } = require('./modules/curriculum/seed.job');
const { registerSigtermHandler } = require('./modules/roadmap/roadmap.triggers');

const app = express();

app.use(cors());
app.use(express.json());

// Database connection
connectDB();

app.get('/health', (req, res) => {
	res.status(200).json({ ok: true });
});

app.use('/api/onboarding', onboardingRouter);
app.use('/api/skill-tree', skillTreeRouter);
app.use('/api/roadmaps', roadmapRouter);
app.use('/api/tagging', taggingRouter);
app.use('/api/search', searchRouter);

app.use((err, req, res, next) => {
	const status = err?.status || 500;
	const code = err?.code || 'INTERNAL_ERROR';
	const message = err?.message || 'Unexpected server error';
	res.status(status).json({ error: { code, message } });
});

registerCronJob();
registerSigtermHandler();

// Start tagging worker
taggingWorker.start();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
