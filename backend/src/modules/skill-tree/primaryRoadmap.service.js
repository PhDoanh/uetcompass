// Adapter for Feature 009 primary roadmap
// In production, this would call GET /api/roadmaps/primary
// For testing, this can be mocked

let mockFetch = null;

async function getPrimaryRoadmap(studentId) {
  // Allow test injection
  if (mockFetch) {
    const roadmap = await mockFetch(studentId);
    return roadmap;
  }

  // In production: call Feature 009 API endpoint
  // For now: throw error indicating Feature 009 should provide this
  throw new Error('PRIMARY_ROADMAP_NOT_FOUND');
}

function __setFetchForTests(fn) {
  mockFetch = fn;
}

function __resetMock() {
  mockFetch = null;
}

async function triggerRepersonalize(studentId) {
  // Delegates to Feature 009 POST /api/roadmaps/retry
  throw new Error('Feature 009 integration not implemented');
}

module.exports = {
  getPrimaryRoadmap,
  triggerRepersonalize,
  __setFetchForTests,
  __resetMock,
};
