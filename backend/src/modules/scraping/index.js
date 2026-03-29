/**
 * T052: Scraping Module Index
 * Exports all services, adapters, and models for cross-module use
 * Maintains modular boundary - does not import from other modules
 */

// Models
const AcademicDocument = require('./models/academicDocument.model');
const SkillTrendSnapshot = require('./models/skillTrendSnapshot.model');
const LearningResource = require('./models/learningResource.model');

// Adapters
const tavilyAdapter = require('./adapters/tavily.adapter');

// Services
const academicFinder = require('./services/academicFinder.service');
const marketTracker = require('./services/marketTracker.service');
const resourceCrawler = require('./services/resourceCrawler.service');
const nodesCatalog = require('./services/nodesCatalog.service');
const studentCatalog = require('./services/studentCatalog.service');
const skillInference = require('./services/skillInference.service');
const personalizationContext = require('./services/personalizationContext.service');

// Routes
const academicRoutes = require('./routes/academic.routes');
const trendsRoutes = require('./routes/trends.routes');
const resourcesRoutes = require('./routes/resources.routes');

// Configuration and jobs
const config = require('./scraping.config');
const scrapingJob = require('./scraping.job');

module.exports = {
  // Models
  models: {
    AcademicDocument,
    SkillTrendSnapshot,
    LearningResource
  },

  // Adapters
  adapters: {
    tavily: tavilyAdapter
  },

  // Services
  services: {
    academicFinder,
    marketTracker,
    resourceCrawler,
    nodesCatalog,
    studentCatalog,
    skillInference,
    personalizationContext
  },

  // Routes
  routes: {
    academic: academicRoutes,
    trends: trendsRoutes,
    resources: resourcesRoutes
  },

  // Configuration
  config,
  scrapingJob
};
