const roadmapService = require('../roadmap/roadmap.service');

// Adapter for Feature 009 primary roadmap
// Fetches the student's primary roadmap from the roadmaps collection
// Returns a normalized object compatible with Skill Tree consumption

let mockFetch = null;

/**
 * Get the primary roadmap for a student from Feature 009 collection
 * Normalizes the response to match Skill Tree's expected structure
 * @param {string} studentId - User ID
 * @returns {Promise<Object>} - Roadmap with nodes, careerGoal, etc.
 * @throws {Error} - If no primary roadmap exists
 */
async function getPrimaryRoadmap(studentId) {
  // Allow test injection
  if (mockFetch) {
    return await mockFetch(studentId);
  }

  try {
    // Prefer accepted primary roadmap, then fall back to retryable roadmap
    // so Skill Tree can render retry UI instead of onboarding-not-found.
    let roadmap = await roadmapService.getPrimaryByUser(studentId);
    if (!roadmap) {
      roadmap = await roadmapService.getRetryableByUser(studentId);
    }

    if (!roadmap) {
      const error = new Error('No primary roadmap found. Please complete onboarding first.');
      error.code = 'ROADMAP_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Normalize roadmap structure for Skill Tree consumption
    return {
      roadmapId: roadmap._id.toString(),
      userId: roadmap.userId.toString(),
      studentProfileId: roadmap.studentProfileId?.toString() || null,
      personalisationLevel: roadmap.personalisationLevel,
      roadmapName: roadmap.roadmapName || `${roadmap.personalisationLevel === 'full' ? 'Personalized' : 'Generic'} Roadmap`,
      nodes: (roadmap.nodes || []).map((node) => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        skillName: node.skillName,
        parentNodeId: node.parentNodeId ?? null,
        relatedCourses: node.relatedCourses || [],
        reason: node.reason,
        resources: node.resources || [],
      })),
      acceptedAt: roadmap.acceptedAt,
      isPrimary: roadmap.isPrimary,
      createdAt: roadmap.createdAt,
      updatedAt: roadmap.updatedAt,
    };
  } catch (err) {
    if (err.code && err.status) {
      throw err; // Already a structured error
    }
    const structuredErr = new Error(`Failed to fetch primary roadmap: ${err.message}`);
    structuredErr.code = 'ROADMAP_FETCH_FAILED';
    structuredErr.status = 500;
    throw structuredErr;
  }
}

/**
 * Repersonalization is handled by Feature 005 (Account Management) and Feature 009
 * Feature 005 calls Feature 009 endpoint directly: POST /api/roadmaps/primary/regenerate
 * This function is kept for backward compatibility but not used in the current architecture
 * 
 * @deprecated Use Feature 009 endpoint directly
 * @param {string} studentId - User ID
 */
async function triggerRepersonalize(studentId) {
  // Feature 005 and 009 handle this directly
  // Skill Tree does not trigger repersonalization
  throw new Error('Use Feature 009 endpoint directly: POST /api/roadmaps/primary/regenerate');
}

function __setFetchForTests(fn) {
  mockFetch = fn;
}

function __resetMock() {
  mockFetch = null;
}

module.exports = {
  getPrimaryRoadmap,
  triggerRepersonalize,
  __setFetchForTests,
  __resetMock,
};
