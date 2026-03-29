/**
 * T052: Scraping Module Index
 * Exports public API: routes and job registration
 * Internal services, adapters, and models remain private (encapsulation)
 */

// Routes - needed by app.js for endpoint registration
const academicRouter = require('./routes/academic.routes');
const trendsRouter = require('./routes/trends.routes');
const resourcesRouter = require('./routes/resources.routes');

// Job registration - needed by app.js for background task management
const scrapingJob = require('./scraping.job');

module.exports = {
	// Public API: Routes (Router suffix follows naming convention)
	academicRouter,
	trendsRouter,
	resourcesRouter,

	// Public API: Job registration
	scrapingJob,
};
