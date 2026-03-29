const taggingService = require('./tagging.service');
const logger = require('../../lib/logger');
const config = require('../../lib/config');

class TaggingWorker {
    start() {
        this.interval = setInterval(async () => {
            try {
                await taggingService.processBatch();
            } catch (error) {
                logger.error('Batch processing error:', error);
            }
        }, config.jobIntervalMs);

        logger.info(`Tagging worker started with interval ${config.jobIntervalMs}ms`);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            logger.info('Tagging worker stopped');
        }
    }

    async processPendingJobs() {
        // Manual trigger for testing
        await taggingService.processBatch();
    }
}

module.exports = new TaggingWorker();