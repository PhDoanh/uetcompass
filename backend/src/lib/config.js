require('dotenv').config();

const config = {
    port: process.env.PORT || 4000,
    mongoUri: process.env.MONGODB_URI,
    llmProvider: process.env.LLM_PROVIDER || 'google',
    llmApiKey: process.env.LLM_API_KEY,
    devServiceKey: process.env.DEV_SERVICE_KEY,
    jobIntervalMs: parseInt(process.env.JOB_INTERVAL_MS) || 30000, // 30 seconds
    batchSize: parseInt(process.env.BATCH_SIZE) || 10,
};

module.exports = config;