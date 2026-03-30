/**
 * T039: Resource Crawler Service (User Story 3)
 * Crawls learning resources for each trending skill
 */

const LearningResource = require('../models/learningResource.model');
const tavilyAdapter = require('../adapters/tavily.adapter');

/**
 * Classify learning resource as free or paid
 * @param {string} sourcePlatform - Platform name
 * @param {string} snippet - Resource snippet/description
 * @returns {boolean} true if free, false if paid
 */
function classifyAsPaid(sourcePlatform, snippet) {
  const lower = snippet.toLowerCase();

  // Always free platforms
  if (sourcePlatform === 'youtube' || sourcePlatform === 'freecodecamp') {
    return false;
  }

  // Free indicators
  if (lower.includes('free') || lower.includes('miễn phí')) {
    return false;
  }

  // Coursera audit option
  if (sourcePlatform === 'coursera' && lower.includes('audit')) {
    return false;
  }

  // Default to paid
  return true;
}

/**
 * Extract quality signal from snippet
 * @param {string} sourcePlatform - Platform
  * @param {string} snippet - Snippet
 * @returns {object|null} {type, value} or null
 */
function extractQualitySignal(sourcePlatform, snippet) {
  // Try to extract rating
  const ratingMatch = snippet.match(/(\d\.\d)\s*(?:rating|stars|⭐|★)/i);
  if (ratingMatch) {
    return {
      type: 'rating',
      value: parseFloat(ratingMatch[1])
    };
  }

  // Try to extract view count
  const viewMatch = snippet.match(/(\d+(?:[.,]\d+)?)\s*(?:views|views?|xem)/i);
  if (viewMatch) {
    return {
      type: 'view_count',
      value: parseInt(viewMatch[1].replace(/[.,]/g, ''))
    };
  }

  // Try to extract enrollment count
  const enrollMatch = snippet.match(/(\d+(?:[.,]\d+)?)\s*(?:students|learners|enrolled)/i);
  if (enrollMatch) {
    return {
      type: 'enrollment_count',
      value: parseInt(enrollMatch[1].replace(/[.,]/g, ''))
    };
  }

  return null;
}

/**
 * Detect platform from URL and source
 * @param {string} url - URL
 * @param {string} source - Source from Tavily
 * @returns {string} Platform enum value
 */
function detectPlatform(url, source) {
  const lower = `${url} ${source}`.toLowerCase();

  if (lower.includes('udemy')) return 'udemy';
  if (lower.includes('coursera')) return 'coursera';
  if (lower.includes('youtube') || lower.includes('youtube.com')) return 'youtube';
  if (lower.includes('edx')) return 'edx';
  if (lower.includes('freecodecamp')) return 'freecodecamp';
  if (lower.includes('viblo')) return 'viblo';
  if (lower.includes('linkedin_learning') || lower.includes('linkedin learning')) return 'linkedin_learning';

  return 'other';
}

/**
 * Detect resource type
 * @param {string} url - URL
 * @param {string} title - Title
 * @returns {string} Resource type
 */
function detectResourceType(url, title) {
  const combined = `${url} ${title}`.toLowerCase();

  if (combined.includes('video') || combined.includes('youtube') || combined.includes('playlist')) {
    return 'video';
  }
  if (combined.includes('course')) return 'course';
  if (combined.includes('article') || combined.includes('blog') || combined.includes('post')) {
    return 'article';
  }
  if (combined.includes('doc') || combined.includes('guide')) return 'documentation';

  return 'tutorial';
}

/**
 * Main crawl logic: process SkillTrendSnapshots
 * @param {Array} skillTrendSnapshots - Snapshots to process
 * @returns {Promise<Array>} Results
 */
async function crawlResourcesForSkills(skillTrendSnapshots = []) {
  try {
    if (!Array.isArray(skillTrendSnapshots) || skillTrendSnapshots.length === 0) {
      throw new Error('skillTrendSnapshots must be a non-empty array from market tracker output');
    }

    const results = [];
    console.log(`[ResourceCrawler] Processing ${skillTrendSnapshots.length} skill snapshots...`);

    for (const snapshot of skillTrendSnapshots) {
      try {
        const { _id: snapshotId, skillName, courseName } = snapshot;

        console.log(`[ResourceCrawler] Crawling resources for skill: "${skillName}"`);

        // Search Tavily for resources
        const tavilyResults = await tavilyAdapter.resourceSearch(skillName);

        let resourcesFound = 0;

        for (const result of tavilyResults) {
          try {
            const { title, url, snippet, source } = result;

            // Classify
            const sourcePlatform = detectPlatform(url, source);
            const resourceType = detectResourceType(url, title);
            const isFree = !classifyAsPaid(sourcePlatform, snippet);
            const qualitySignal = extractQualitySignal(sourcePlatform, snippet);

            // Upsert by (skillTrendSnapshotId, url)
            const upsertResult = await LearningResource.findOneAndUpdate(
              { skillTrendSnapshotId: snapshotId, url },
              {
                skillTrendSnapshotId: snapshotId,
                skillName,
                courseName,
                title,
                url,
                sourcePlatform,
                resourceType,
                isFree,
                qualitySignal: qualitySignal,
                lastCrawledAt: new Date(),
                isAvailable: true
              },
              { upsert: true, new: true }
            );

            if (upsertResult) {
              resourcesFound++;
            }

          } catch (docError) {
            console.error(`[ResourceCrawler] Failed to process resource "${result.title}":`, docError.message);
          }
        }

        results.push({
          skillTrendSnapshotId: snapshotId,
          skillName,
          resourcesFound
        });

      } catch (snapError) {
        console.error(`[ResourceCrawler] Failed to process snapshot:`, snapError.message);
        results.push({
          skillTrendSnapshotId: snapshot._id,
          skillName: snapshot.skillName,
          resourcesFound: 0,
          error: snapError.message
        });
      }
    }

    console.log('[ResourceCrawler] Crawl complete:', results);
    return results;

  } catch (error) {
    console.error('[ResourceCrawler] Crawl failed:', error.message);
    throw error;
  }
}

async function runResourceCrawler() {
  throw new Error('Periodic run disabled. Use trigger endpoint from Feature 009.');
}

module.exports = {
  crawlResourcesForSkills,
  runResourceCrawler,
  classifyAsPaid,
  detectPlatform,
  detectResourceType,
  extractQualitySignal
};
