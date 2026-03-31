/**
 * T051: Scraping Configuration
 * Centralized configuration for all scraping operations
 */

module.exports = {
  // API Keys and credentials
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || '',
    baseUrl: 'https://api.tavily.com/search'
  },



  // Cron job schedules (UTC time)
  schedules: {
    // Academic finder: weekly Saturday 2 AM
    academicFinder: '0 2 * * 0',
    // Market tracker: daily 3 AM
    marketTracker: '0 3 * * *',
    // Resource crawler: daily 4 AM
    resourceCrawler: '0 4 * * *'
  },

  // Cache settings
  cache: {
    trendsExpiry: 5 * 60 * 1000 // 5 minutes
  },

  // API request settings
  api: {
    timeout: 30000,
    retries: 2
  },

  // Crawl settings
  crawl: {
    tavily: {
      maxResults: 15,
      includeRawContent: true
    }
  },

  // Feature flags
  features: {
    personalizationContext: true,
    caching: true
  }
};
