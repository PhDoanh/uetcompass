/**
 * Scraping Job Scheduler (disabled in MVP)
 * Feature 003 now runs only when triggered by Feature 009.
 */

const config = require('./scraping.config');

let scheduledJobs = [];

/**
 * Register all cron jobs
 * Called on server startup
 */
function register() {
  scheduledJobs = [];
  console.log('[ScrapingJobs] Periodic jobs are disabled. Use POST /api/resources/crawl/trigger from Feature 009.');
}

/**
 * Unregister all scheduled jobs
 * Called on server shutdown
 */
function unregister() {
  scheduledJobs.forEach(job => {
    if (job) {
      job.stop();
    }
  });
  scheduledJobs = [];
  console.log('[ScrapingJobs] All jobs unregistered');
}

module.exports = {
  register,
  unregister,
  config
};
