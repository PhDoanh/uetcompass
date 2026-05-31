'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const crawlService = require('./crawl.service');

function readArg(name) {
    const prefix = `--${name}=`;
    const match = process.argv.find((arg) => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : undefined;
}

async function runManualCli() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/uetcompass';
    const roleCode = readArg('role');
    const sourceCode = readArg('source');
    const limitPerSource = Number(readArg('limit') || 10);

    await mongoose.connect(mongoUri);
    try {
        const summary = await crawlService.runCrawl({ sourceCode, roleCode, limitPerSource });
        console.log(JSON.stringify(summary, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    runManualCli().catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
}

module.exports = { runManualCli };
