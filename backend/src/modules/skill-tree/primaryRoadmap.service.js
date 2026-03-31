const roadmapService = require('../roadmap/roadmap.service');
const { CourseUnit } = require('../curriculum/courseUnit.model');

// Adapter for Feature 009 primary roadmap
// Fetches the student's primary roadmap from the roadmaps collection
// Returns a normalized object compatible with Skill Tree consumption

let mockFetch = null;

function shouldUseDevFallbackRoadmap() {
  return process.env.SKILL_TREE_DEV_BYPASS_AUTH === 'true' || process.env.NODE_ENV !== 'production';
}

function buildDevFallbackRoadmap(studentId) {
  const now = new Date();
  return {
    roadmapId: 'dev-fallback-roadmap',
    userId: String(studentId),
    studentProfileId: null,
    personalisationLevel: 'low',
    status: 'completed',
    careerGoal: 'frontend-developer',
    roadmapName: 'Dev Fallback Roadmap',
    nodes: [
      {
        courseCode: 'IT2101',
        courseName: 'Cau truc du lieu va giai thuat',
        credits: 4,
        suggestedSemester: 3,
        gainedSkills: ['Big O Analysis', 'Tree and Graph'],
        supportingSkills: [],
        reason: 'Foundation for algorithmic thinking and optimization.',
        resources: [],
        prerequisites: [],
      },
      {
        courseCode: 'IT2102',
        courseName: 'Lap trinh huong doi tuong',
        credits: 4,
        suggestedSemester: 4,
        gainedSkills: ['OOP Principles', 'Inheritance and Polymorphism'],
        supportingSkills: [],
        reason: 'Core object-oriented software construction.',
        resources: [],
        prerequisites: ['IT2101'],
      },
      {
        courseCode: 'IT3101',
        courseName: 'Co so du lieu',
        credits: 4,
        suggestedSemester: 5,
        gainedSkills: ['SQL Querying', 'Database Design'],
        supportingSkills: [],
        reason: 'Data modeling and database implementation fundamentals.',
        resources: [],
        prerequisites: ['IT2102'],
      },
      {
        courseCode: 'IT4101',
        courseName: 'Cong nghe phan mem',
        credits: 3,
        suggestedSemester: 6,
        gainedSkills: ['Software Architecture', 'Testing Strategy'],
        supportingSkills: [],
        reason: 'Engineering process and delivery quality at scale.',
        resources: [],
        prerequisites: ['IT3101'],
      },
      {
        courseCode: 'IT4102',
        courseName: 'Phat trien ung dung web',
        credits: 3,
        suggestedSemester: 7,
        gainedSkills: ['Frontend Integration', 'Backend API Design'],
        supportingSkills: [],
        reason: 'End-to-end development for modern web products.',
        resources: [],
        prerequisites: ['IT4101'],
      },
    ],
    acceptedAt: now,
    isPrimary: true,
    createdAt: now,
    updatedAt: now,
  };
}

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
    let roadmap = await roadmapService.getPrimaryByUser(studentId);

    if (!roadmap && shouldUseDevFallbackRoadmap()) {
      return buildDevFallbackRoadmap(studentId);
    }
    
    if (!roadmap) {
      const error = new Error('No primary roadmap found. Please complete onboarding first.');
      error.code = 'ROADMAP_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const courseCodes = (roadmap.nodes || []).map((node) => node.courseCode).filter(Boolean);
    const units = await CourseUnit.find({ code: { $in: courseCodes } }).lean();
    const prerequisiteMap = new Map(units.map((unit) => [unit.code, unit.prerequisites || []]));

    // Normalize roadmap structure for Skill Tree consumption
    return {
      roadmapId: roadmap._id.toString(),
      userId: roadmap.userId.toString(),
      studentProfileId: roadmap.studentProfileId?.toString() || null,
      personalisationLevel: roadmap.personalisationLevel,
      status: roadmap.status,
      careerGoal: roadmap.careerGoal || null,
      roadmapName: roadmap.roadmapName || `${roadmap.personalisationLevel === 'full' ? 'Personalized' : 'Generic'} Roadmap`,
      nodes: (roadmap.nodes || []).map(node => ({
        courseCode: node.courseCode,
        courseName: node.courseName,
        nameVi: node.courseName,
        nameEn: node.courseName,
        credits: node.credits,
        suggestedSemester: node.suggestedSemester,
        gainedSkills: node.gainedSkills || node.skills || [],
        supportingSkills: node.supportingSkills || [],
        reason: node.reason,
        resources: node.resources || [],
        prerequisites: prerequisiteMap.get(node.courseCode) || node.prerequisites || [],
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
