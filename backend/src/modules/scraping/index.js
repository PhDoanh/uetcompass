/**
 * T052: Scraping Module Index
 * Exports public API: routes and job registration
 * Internal services, adapters, and models remain private (encapsulation)
 */

// Routes - needed by app.js for endpoint registration
const academicRoutes = require('./routes/academic.routes');
const trendsRoutes = require('./routes/trends.routes');
const resourcesRoutes = require('./routes/resources.routes');

// Job registration - needed by app.js for background task management
const scrapingJob = require('./scraping.job');

module.exports = {
	// Public API: Routes
	routes: {
		academic: academicRoutes,
		trends: trendsRoutes,
		resources: resourcesRoutes,
	},

	// Public API: Job registration
	scrapingJob,
};
