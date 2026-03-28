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
    // Fetch primary roadmap from Feature 009
    const roadmap = await roadmapService.getPrimaryByUser(studentId);
    
    if (!roadmap) {
      const error = new Error('No primary roadmap found. Please complete onboarding first.');
      error.code = 'ROADMAP_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Normalize roadmap structure for Skill Tree consumption
    // Feature 009 stores prerequisites in CourseUnit, Skill Tree will compute from DAG
    return {
      roadmapId: roadmap._id.toString(),
      userId: roadmap.userId.toString(),
      studentProfileId: roadmap.studentProfileId?.toString() || null,
      personalisationLevel: roadmap.personalisationLevel,
      status: roadmap.status,
      careerGoal: roadmap.careerGoal || null,
      roadmapName: `${roadmap.personalisationLevel === 'full' ? 'Personalized' : 'Generic'} Roadmap`,
      nodes: (roadmap.nodes || []).map(node => ({
        courseCode: node.courseCode,
        courseName: node.courseName,
        credits: node.credits,
        suggestedSemester: node.suggestedSemester,
        gainedSkills: node.gainedSkills || [],
        supportingSkills: node.supportingSkills || [],
        reason: node.reason,
        resources: node.resources || [],
        // These will be populated from CourseUnit prerequisites
        prerequisites: [],
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
