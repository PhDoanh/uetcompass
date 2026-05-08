/**
 * T010: Tavily Search API Adapter
 * Unified interface for all three search modes (academic, trends, resources)
 * Wraps @tavily/core SDK with error handling and result formatting
 */

const { tavily } = require('@tavily/core');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const REQUEST_TIMEOUT_MS = Number(process.env.CRAWL_URL_TIMEOUT_MS || 5000);
const ACADEMIC_MAX_RESULTS = 10;
const TREND_MAX_RESULTS = 15;
const RESOURCE_MAX_RESULTS = 10;

let client = null;

function getClient() {
  if (client) {
    return client;
  }

  if (!TAVILY_API_KEY) {
    return null;
  }

  client = tavily({ apiKey: TAVILY_API_KEY });
  return client;
}

const FALLBACK_ACADEMIC = [
  'https://ocw.mit.edu',
  'https://www.geeksforgeeks.org',
  'https://www.w3schools.com',
  'https://developer.mozilla.org',
  'https://www.postgresql.org/docs/',
  'https://github.com/topics/data-structures',
  'https://www.coursera.org',
  'https://www.edx.org',
  'https://www.khanacademy.org/computing',
  'https://www.tutorialspoint.com',
];

const FALLBACK_TRENDS = [
  'https://www.linkedin.com/jobs',
  'https://www.topcv.vn',
  'https://www.vietnamworks.com',
  'https://www.itviec.com',
  'https://www.glassdoor.com/Job/index.htm',
  'https://www.indeed.com',
  'https://www.levels.fyi',
  'https://github.com/topics/software-engineering',
  'https://news.ycombinator.com',
  'https://www.devjobsscanner.com',
  'https://builtin.com/jobs',
  'https://stackoverflow.com/jobs',
  'https://wellfound.com/jobs',
  'https://arc.dev',
  'https://remoteok.com/remote-dev-jobs',
];

const FALLBACK_RESOURCES_FREE = [
  'https://developer.mozilla.org',
  'https://www.freecodecamp.org',
  'https://www.youtube.com/c/TraversyMedia',
  'https://www.youtube.com/c/Academind',
  'https://www.geeksforgeeks.org',
  'https://roadmap.sh',
  'https://www.theodinproject.com',
  'https://www.khanacademy.org/computing',
  'https://docs.python.org/3/',
  'https://nodejs.org/docs/latest/api/',
];

const FALLBACK_RESOURCES_PAID = [
  'https://www.udemy.com',
  'https://www.coursera.org',
  'https://www.edx.org',
  'https://www.pluralsight.com',
  'https://www.educative.io',
  'https://frontendmasters.com',
  'https://www.datacamp.com',
  'https://www.codecademy.com',
  'https://www.linkedin.com/learning',
  'https://zerotomastery.io',
];

function hasValidHttpUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    if (blockedHosts.includes(parsed.hostname)) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

async function withTimeoutFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'UETCompassCrawler/1.0',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function validateReachableUrl(url) {
  if (!hasValidHttpUrl(url)) {
    return false;
  }

  try {
    const headResponse = await withTimeoutFetch(url, { method: 'HEAD' });
    if (headResponse.ok) {
      return true;
    }

    const getResponse = await withTimeoutFetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1024' },
    });
    return getResponse.ok;
  } catch (_error) {
    return false;
  }
}

async function sanitizeAndValidateResults(rawResults, maxResults) {
  const normalized = (rawResults || [])
    .map((result) => ({
      title: result?.title || 'Untitled',
      url: result?.url || '',
      snippet: result?.content || result?.snippet || result?.title || '',
      source: result?.source || '',
    }))
    .filter((result) => hasValidHttpUrl(result.url));

  const uniqueByUrl = [];
  const seen = new Set();
  normalized.forEach((result) => {
    if (!seen.has(result.url)) {
      seen.add(result.url);
      uniqueByUrl.push(result);
    }
  });

  const validated = [];
  for (const result of uniqueByUrl) {
    // Validate each URL before persisting it into downstream collections.
    const reachable = await validateReachableUrl(result.url);
    if (reachable) {
      validated.push(result);
    }
    if (validated.length >= maxResults) {
      break;
    }
  }

  return validated;
}

async function topUpToMaxResults(validatedResults, fallbackUrls, prefix, keyword, maxResults) {
  if (validatedResults.length >= maxResults) {
    return validatedResults.slice(0, maxResults);
  }

  const needed = maxResults - validatedResults.length;
  const existingUrls = new Set(validatedResults.map((item) => item.url));
  const fallbackCandidates = buildFallbackResults(fallbackUrls, prefix, keyword)
    .filter((item) => !existingUrls.has(item.url));

  const fallbackValidated = await sanitizeAndValidateResults(fallbackCandidates, needed);
  return [...validatedResults, ...fallbackValidated].slice(0, maxResults);
}

function buildFallbackResults(urls, prefix, keyword) {
  return urls.map((url, index) => ({
    title: `${prefix} ${index + 1} - ${keyword}`,
    url,
    content: `${prefix} material for ${keyword}`,
    source: new URL(url).hostname,
  }));
}

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
    const searchClient = getClient();
    if (!searchClient) {
      throw new Error('Missing TAVILY_API_KEY');
    }

    const query = `${courseName} slides lecture notes UET education`;
    
    const response = await searchClient.search(query, {
      include_raw_content: false,
      max_results: ACADEMIC_MAX_RESULTS,
      include_images: false,
      include_answer: false
    });

    const validated = await sanitizeAndValidateResults(response.results || [], ACADEMIC_MAX_RESULTS);
    return topUpToMaxResults(
      validated,
      FALLBACK_ACADEMIC,
      'Academic Resource',
      courseName,
      ACADEMIC_MAX_RESULTS
    );
  } catch (error) {
    console.error('[Tavily] Academic search failed:', error.message);
    const fallbackValidated = await sanitizeAndValidateResults(
      buildFallbackResults(FALLBACK_ACADEMIC, 'Academic Resource', courseName),
      ACADEMIC_MAX_RESULTS
    );
    if (fallbackValidated.length === 0) {
      throw new Error(`Tavily academic search failed: ${error.message}`);
    }
    return topUpToMaxResults(
      fallbackValidated,
      FALLBACK_ACADEMIC,
      'Academic Resource',
      courseName,
      ACADEMIC_MAX_RESULTS
    );
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
    const searchClient = getClient();
    if (!searchClient) {
      throw new Error('Missing TAVILY_API_KEY');
    }

    // Build enriched query with personalization context
    let query = `${courseName} skills job market demand trending`;
    
    if (personalizationContext) {
      const { major, careerRole, companyType } = personalizationContext;
      if (major) query += ` ${major}`;
      if (careerRole) query += ` ${careerRole}`;
      if (companyType) query += ` ${companyType}`;
    }

    const response = await searchClient.search(query, {
      include_raw_content: false,
      max_results: TREND_MAX_RESULTS,
      include_images: false,
      include_answer: false
    });

    const validated = await sanitizeAndValidateResults(response.results || [], TREND_MAX_RESULTS);
    return topUpToMaxResults(
      validated,
      FALLBACK_TRENDS,
      'Market Trend Source',
      courseName,
      TREND_MAX_RESULTS
    );
  } catch (error) {
    console.error('[Tavily] Trend search failed:', error.message);
    const fallbackValidated = await sanitizeAndValidateResults(
      buildFallbackResults(FALLBACK_TRENDS, 'Market Trend Source', courseName),
      TREND_MAX_RESULTS
    );
    if (fallbackValidated.length === 0) {
      throw new Error(`Tavily trend search failed: ${error.message}`);
    }
    return topUpToMaxResults(
      fallbackValidated,
      FALLBACK_TRENDS,
      'Market Trend Source',
      courseName,
      TREND_MAX_RESULTS
    );
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
async function resourceSearch(skillName, mode = 'mixed') {
  try {
    const searchClient = getClient();
    if (!searchClient) {
      throw new Error('Missing TAVILY_API_KEY');
    }

    let query = `learn ${skillName} course tutorial`;
    if (mode === 'free') {
      query += ' free open source';
    } else if (mode === 'paid') {
      query += ' paid premium bootcamp';
    } else {
      query += ' free paid';
    }
    
    const response = await searchClient.search(query, {
      include_raw_content: false,
      max_results: RESOURCE_MAX_RESULTS,
      include_images: false,
      include_answer: false
    });

    const validated = await sanitizeAndValidateResults(response.results || [], RESOURCE_MAX_RESULTS);
    const fallbackSource = mode === 'paid' ? FALLBACK_RESOURCES_PAID : FALLBACK_RESOURCES_FREE;
    return topUpToMaxResults(
      validated,
      fallbackSource,
      'Learning Resource',
      skillName,
      RESOURCE_MAX_RESULTS
    );
  } catch (error) {
    console.error('[Tavily] Resource search failed:', error.message);
    const fallbackSource = mode === 'paid' ? FALLBACK_RESOURCES_PAID : FALLBACK_RESOURCES_FREE;
    const fallbackValidated = await sanitizeAndValidateResults(
      buildFallbackResults(fallbackSource, 'Learning Resource', skillName),
      RESOURCE_MAX_RESULTS
    );
    if (fallbackValidated.length === 0) {
      throw new Error(`Tavily resource search failed: ${error.message}`);
    }
    return topUpToMaxResults(
      fallbackValidated,
      fallbackSource,
      'Learning Resource',
      skillName,
      RESOURCE_MAX_RESULTS
    );
  }
}

module.exports = {
  academicSearch,
  trendSearch,
  resourceSearch,
  validateReachableUrl,
  hasValidHttpUrl,
  ACADEMIC_MAX_RESULTS,
  TREND_MAX_RESULTS,
  RESOURCE_MAX_RESULTS,
  getClient,
  get client() {
    return client;
  }
};
