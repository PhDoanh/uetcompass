/**
 * Trigger-driven curation pipeline for Feature 003
 * Sequence: AcademicDocument -> SkillTrendSnapshot -> LearningResource
 */

const academicFinder = require('./academicFinder.service');
const marketTracker = require('./marketTracker.service');
const resourceCrawler = require('./resourceCrawler.service');
const studentCatalog = require('./studentCatalog.service');

function normalizeNodes(nodes = []) {
  return nodes
    .filter(node => node && typeof node.courseName === 'string' && node.courseName.trim())
    .map(node => ({
      courseName: node.courseName.trim()
    }));
}

async function buildStudentProfiles(studentProfileId) {
  if (!studentProfileId) {
    return [];
  }

  const profile = await studentCatalog.fetchStudentProfile(studentProfileId);
  return profile ? [profile] : [];
}

async function runTriggeredPipeline({ nodes = [], studentProfileId = null }) {
  const startedAt = new Date().toISOString();
  const normalizedNodes = normalizeNodes(nodes);

  if (normalizedNodes.length === 0) {
    throw new Error('nodes must contain at least one item with non-empty courseName');
  }

  const studentProfiles = await buildStudentProfiles(studentProfileId);

  const academicResults = await academicFinder.crawlAcademicMaterialsPerNode(normalizedNodes);
  const marketOutput = await marketTracker.crawlMarketTrendsPerNode(normalizedNodes, studentProfiles);
  const resourceResults = await resourceCrawler.crawlResourcesForSkills(marketOutput.snapshots);

  return {
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    summary: {
      nodesRequested: normalizedNodes.length,
      academicNodesProcessed: academicResults.length,
      trendNodesProcessed: marketOutput.results.length,
      snapshotsProcessed: marketOutput.snapshots.length,
      resourceSnapshotsProcessed: resourceResults.length
    },
    details: {
      academic: academicResults,
      trends: marketOutput.results,
      resources: resourceResults
    }
  };
}

module.exports = {
  runTriggeredPipeline
};
