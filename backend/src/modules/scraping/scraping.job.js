/**
 * T050: Scraping Job Scheduler
 * Node-cron registrations for all three crawl pipelines
 * Runs in sequence: Academic → Market Trends → Resources
 */

const cron = require('node-cron');
const config = require('./scraping.config');
const academicFinder = require('./services/academicFinder.service');
const marketTracker = require('./services/marketTracker.service');
const resourceCrawler = require('./services/resourceCrawler.service');

let scheduledJobs = [];

/**
 * Register all cron jobs
 * Called on server startup
 */
function register() {
  if (process.env.NODE_ENV === 'test') {
    console.log('[ScrapingJobs] Skipping job registration in test environment');
    return;
  }

  try {
    // Academic Materials Finder - Weekly Saturday 2 AM UTC
    const academicJob = cron.schedule(config.schedules.academicFinder, async () => {
      console.log('[ScrapingJobs] Starting academic materials finder job...');
      try {
        await academicFinder.runAcademicFinder();
        console.log('[ScrapingJobs] Academic finder completed successfully');
      } catch (error) {
        console.error('[ScrapingJobs] Academic finder failed:', error.message);
      }
    });
    scheduledJobs.push(academicJob);
    console.log(`[ScrapingJobs] Academic finder scheduled: ${config.schedules.academicFinder}`);

    // Market Trends Tracker - Daily 3 AM UTC
    const marketJob = cron.schedule(config.schedules.marketTracker, async () => {
      console.log('[ScrapingJobs] Starting market trends tracker job...');
      try {
        await marketTracker.runMarketTracker();
        console.log('[ScrapingJobs] Market tracker completed successfully');
      } catch (error) {
        console.error('[ScrapingJobs] Market tracker failed:', error.message);
      }
    });
    scheduledJobs.push(marketJob);
    console.log(`[ScrapingJobs] Market tracker scheduled: ${config.schedules.marketTracker}`);

    // Resource Crawler - Daily 4 AM UTC
    // Note: This would need to fetch recent SkillTrendSnapshots from the previous crawl
    const resourceJob = cron.schedule(config.schedules.resourceCrawler, async () => {
      console.log('[ScrapingJobs] Starting resource crawler job...');
      try {
        // Placeholder: fetch recent snapshots
        await resourceCrawler.runResourceCrawler([]);
        console.log('[ScrapingJobs] Resource crawler completed successfully');
      } catch (error) {
        console.error('[ScrapingJobs] Resource crawler failed:', error.message);
      }
    });
    scheduledJobs.push(resourceJob);
    console.log(`[ScrapingJobs] Resource crawler scheduled: ${config.schedules.resourceCrawler}`);

  } catch (error) {
    console.error('[ScrapingJobs] Failed to register jobs:', error.message);
    throw error;
  }
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
