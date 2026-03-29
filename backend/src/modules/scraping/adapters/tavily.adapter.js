/**
 * T010: Tavily Search API Adapter
 * Unified interface for all three search modes (academic, trends, resources)
 * Wraps @tavily/core SDK with error handling and result formatting
 */

const { tavily } = require('@tavily/core');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

// Initialize Tavily client
const client = tavily({ apiKey: TAVILY_API_KEY });

/**
 * Search for academic materials by course name
 * Input: courseName only (generic query, no personalization)
 * Output: Array of academic document candidates
 * 
 * @param {string} courseName - The course name to search for
 * @returns {Promise<Array>} Array of search results with titles, URLs, sources
 */
async function academicSearch(courseName) {
  try {
    const query = `${courseName} slides lecture notes UET education`;
    
    const response = await client.search(query, {
      include_raw_content: true,
      max_results: 10,
      include_images: false,
      include_answer: false
    });

    // Format results for AcademicDocument model
    return (response.results || []).map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      source: result.source
    }));
  } catch (error) {
    console.error('[Tavily] Academic search failed:', error.message);
    throw new Error(`Tavily academic search failed: ${error.message}`);
  }
}

/**
 * Search for market trends by course name + personalization context
 * Input: courseName + optional personalization (major, careerRole, companyType)
 * Output: Array of job board results with skill mentions
 * 
 * @param {string} courseName - The course name
 * @param {object} personalizationContext - Optional {major, careerRole, companyType}
 * @returns {Promise<Array>} Array of job posting snippets with salary/trend signals
 */
async function trendSearch(courseName, personalizationContext = null) {
  try {
    // Build enriched query with personalization context
    let query = `${courseName} skills job market demand trending`;
    
    if (personalizationContext) {
      const { major, careerRole, companyType } = personalizationContext;
      if (major) query += ` ${major}`;
      if (careerRole) query += ` ${careerRole}`;
      if (companyType) query += ` ${companyType}`;
    }

    const response = await client.search(query, {
      include_raw_content: true,
      max_results: 15,
      include_images: false,
      include_answer: false
    });

    // Format results for SkillTrendSnapshot extraction
    return (response.results || []).map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      source: result.source
    }));
  } catch (error) {
    console.error('[Tavily] Trend search failed:', error.message);
    throw new Error(`Tavily trend search failed: ${error.message}`);
  }
}

/**
 * Search for learning resources by skill name
 * Input: skillName only (generic query, no personalization)
 * Output: Array of learning resource candidates
 * 
 * @param {string} skillName - The skill name to search for
 * @returns {Promise<Array>} Array of learning resources with platform info
 */
async function resourceSearch(skillName) {
  try {
    const query = `learn ${skillName} course tutorial free paid`;
    
    const response = await client.search(query, {
      include_raw_content: true,
      max_results: 10,
      include_images: false,
      include_answer: false
    });

    // Format results for LearningResource model
    return (response.results || []).map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      source: result.source
    }));
  } catch (error) {
    console.error('[Tavily] Resource search failed:', error.message);
    throw new Error(`Tavily resource search failed: ${error.message}`);
  }
}

module.exports = {
  academicSearch,
  trendSearch,
  resourceSearch,
  client // Export for testing/mocking
};
