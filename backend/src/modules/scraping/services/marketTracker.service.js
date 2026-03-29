/**
 * T027: Market Tracker Service (User Story 2)
 * Crawls market trends with personalization context
 */

const SkillTrendSnapshot = require('../models/skillTrendSnapshot.model');
const tavilyAdapter = require('../adapters/tavily.adapter');
const nodesCatalog = require('./nodesCatalog.service');
const studentCatalog = require('./studentCatalog.service');
const personalizationContext = require('./personalizationContext.service');
const skillInference = require('./skillInference.service');

/**
 * Parse salary range from job posting snippets
 * @param {string} snippet - Job posting snippet
 * @returns {object|null} {min, max, currency} or null
 */
function parseSalaryRange(snippet) {
  try {
    // Try to find salary patterns like "$50k-80k" or "50-80 USD" or "500-800 triệu VND"
    const vndMatch = snippet.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\s*VND|VND\s*(\d+(?:[.,]\d+)?)/i);
    if (vndMatch) {
      const amount = parseInt(vndMatch[1] || vndMatch[2]);
      return { min: amount, max: amount * 1.5, currency: 'VND' };
    }

    const usdMatch = snippet.match(/\$(\d+)k?\s*-\s*\$?(\d+)k?/i);
    if (usdMatch) {
      const min = parseInt(usdMatch[1]) * (usdMatch[1].includes('k') ? 1000 : 1);
      const max = parseInt(usdMatch[2]) * (usdMatch[2].includes('k') ? 1000 : 1);
      return { min, max, currency: 'USD' };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate trend direction based on 7-day comparison
 * @param {number} currentJobCount - Current job count
 * @param {number} previousJobCount - Previous job count (7 days ago)
 * @returns {string} 'increasing' | 'stable' | 'decreasing'
 */
function calculateTrendDirection(currentJobCount, previousJobCount) {
  if (!previousJobCount) return 'stable';

  const percentChange = ((currentJobCount - previousJobCount) / previousJobCount) * 100;

  if (percentChange >= 10) return 'increasing';
  if (percentChange <= -10) return 'decreasing';
  return 'stable';
}

/**
 * Main crawl logic: process all nodes with personalization
 * @param {Array} roadmapNodes - Nodes to process
 * @param {Array} studentProfiles - Student profiles for personalization
 * @returns {Promise<Array>} Results
 */
async function crawlMarketTrendsPerNode(roadmapNodes = null, studentProfiles = null) {
  try {
    // Get active nodes if not provided
    if (!roadmapNodes) {
      roadmapNodes = await nodesCatalog.getActiveRoadmapNodes();
    }

    // Get student profiles if not provided (optional: can be null for generic crawl)
    if (studentProfiles === null) {
      try {
        studentProfiles = await studentCatalog.getAllStudentProfiles();
      } catch {
        studentProfiles = [];
      }
    }

    const results = [];
    console.log(`[MarketTracker] Processing ${roadmapNodes.length} nodes with ${studentProfiles.length} student profiles...`);

    for (const node of roadmapNodes) {
      try {
        const { _id: nodeId, courseName } = node;

        // Crawl per node per student profile (if profiles exist)
        const profilesToUse = studentProfiles.length > 0 ? studentProfiles : [null];

        for (const profile of profilesToUse) {
          try {
            // Build enriched query
            const personalizationCtx = profile ? {
              major: profile.major,
              careerRole: profile.careerGoal?.role,
              companyType: profile.careerGoal?.companyType
            } : null;

            const enrichedQuery = personalizationContext.enrichQueryWithPersonalization(
              courseName,
              personalizationCtx
            );

            console.log(`[MarketTracker] Crawling: "${courseName}" (node: ${nodeId}) with personalization...`);

            // Search Tavily
            const tavilyResults = await tavilyAdapter.trendSearch(
              courseName,
              personalizationCtx
            );

            // Extract skills
            const snippetText = tavilyResults.map(r => r.snippet).join(' ');
            const extractedSkills = await skillInference.extractSkillsFromJobPostings(
              snippetText
            );

            // Store snapshots per skill
            for (const skill of extractedSkills) {
              try {
                const { skillName, frequency } = skill;
                const snapshotDate = new Date();
                snapshotDate.setHours(0, 0, 0, 0); // Set to midnight UTC

                // Get previous snapshot for trend comparison
                const previousSnapshot = await SkillTrendSnapshot.findOne(
                  {
                    roadmapNodeId: nodeId,
                    skillName,
                    snapshotDate: { $lt: snapshotDate }
                  },
                  {},
                  { sort: { snapshotDate: -1 } }
                );

                const previousJobCount = previousSnapshot?.jobCount || frequency;
                const jobCountTrend = calculateTrendDirection(frequency, previousJobCount);

                // Parse salary
                const salaryRange = parseSalaryRange(snippetText);

                // Upsert snapshot
                await SkillTrendSnapshot.findOneAndUpdate(
                  { roadmapNodeId: nodeId, skillName, snapshotDate },
                  {
                    roadmapNodeId: nodeId,
                    skillName,
                    jobCount: frequency,
                    jobCountTrend,
                    averageSalaryRange: salaryRange,
                    snapshotDate,
                    personalizationContext: personalizationCtx,
                    contributingSources: tavilyResults.map(r => r.source),
                    expiresAt: new Date(snapshotDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                  },
                  { upsert: true, new: true }
                );
              } catch (skillError) {
                console.error(`[MarketTracker] Failed to process skill "${skill.skillName}":`, skillError.message);
              }
            }

            results.push({
              roadmapNodeId: nodeId,
              courseName,
              skillsFound: extractedSkills.length,
              studentId: profile?._id
            });

          } catch (profileError) {
            console.error(`[MarketTracker] Failed to crawl with profile:`, profileError.message);
          }
        }

      } catch (nodeError) {
        console.error(`[MarketTracker] Failed to process node "${node.courseName}":`, nodeError.message);
        results.push({
          roadmapNodeId: node._id,
          courseName: node.courseName,
          skillsFound: 0,
          error: nodeError.message
        });
      }
    }

    console.log('[MarketTracker] Crawl complete:', results);
    return results;

  } catch (error) {
    console.error('[MarketTracker] Crawl failed:', error.message);
    throw error;
  }
}

async function runMarketTracker() {
  return crawlMarketTrendsPerNode();
}

module.exports = {
  crawlMarketTrendsPerNode,
  runMarketTracker,
  calculateTrendDirection,
  parseSalaryRange
};
