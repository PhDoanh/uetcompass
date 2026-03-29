require('dotenv').config();
const express = require('express');
const cors = require('cors');
const onboardingRouter = require('./modules/onboarding/onboarding.routes');
const skillTreeRouter = require('./modules/skill-tree/skillTree.routes');
const roadmapRouter = require('./modules/roadmap/roadmap.routes');
const communityRouter = require('./modules/roadmap/community/community.routes');
const { registerCronJob } = require('./modules/curriculum/seed.job');
const { registerSigtermHandler } = require('./modules/roadmap/roadmap.triggers');

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
app.use('/api/roadmaps', roadmapRouter);
app.use('/api/community', communityRouter);

app.use((err, req, res, next) => {
	const status = err?.status || 500;
	const code = err?.code || 'INTERNAL_ERROR';
	const message = err?.message || 'Unexpected server error';
	res.status(status).json({ error: { code, message } });
});

registerCronJob();
registerSigtermHandler();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
