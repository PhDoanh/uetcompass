const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
	(typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

function getDevUserId() {
  return import.meta.env.VITE_SKILL_TREE_DEV_USER_ID || '000000000000000000000001';
}

function createHeaders(authToken) {
  const token = String(authToken || '').trim();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {
    'x-user-id': getDevUserId(),
  };
}

async function request(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Unknown error';
    const code = payload?.error?.code || payload?.code || 'UNKNOWN';
    const details = payload?.error?.details || payload?.details || {};
    const error = new Error(message);
    error.status = response.status;
    error.code = code;
    error.details = details;
    throw error;
  }

  return payload;
}

export async function getTree(authToken) {
  return request('/skill-tree', {
    method: 'GET',
    headers: createHeaders(authToken),
  });
}

export async function patchNodeStatus(authToken, roadmapId, nodeId, fromState, toState) {
  return request(`/skill-tree/roadmaps/${roadmapId}/progress/node`, {
    method: 'PATCH',
    headers: createHeaders(authToken),
    body: JSON.stringify({
      nodeId,
      fromState,
      toState,
    }),
  });
}

export async function getRoadmapProgress(authToken, roadmapId) {
  return request(`/skill-tree/roadmaps/${roadmapId}/progress`, {
    method: 'GET',
    headers: createHeaders(authToken),
  });
}

export async function getResources(authToken, courseCode) {
  return request(`/skill-tree/nodes/${courseCode}/resources`, {
    method: 'GET',
    headers: createHeaders(authToken),
  });
}

export async function getWhyCourse(authToken, courseCode) {
  return request(`/skill-tree/nodes/${courseCode}/why`, {
    method: 'GET',
    headers: createHeaders(authToken),
  });
}

export async function getMarketSkills(authToken, courseCode) {
  return request(`/skill-tree/nodes/${courseCode}/market-skills`, {
    method: 'GET',
    headers: createHeaders(authToken),
  });
}

export async function getLearningResources(authToken, skillName) {
  return request(`/skill-tree/skills/${encodeURIComponent(skillName)}/learning-resources`, {
    method: 'GET',
    headers: createHeaders(authToken),
  });
}

// Backward-compatible aliases for older call sites.
export const getNodeResources = getResources;
export const getNodeWhy = getWhyCourse;
export const getNodeMarketSkills = getMarketSkills;
export const getSkillLearningResources = getLearningResources;

/**
 * Note: Repersonalization is handled by Feature 005 (Account Management)
 * Feature 005 calls Feature 009 endpoint directly: POST /api/roadmaps/primary/regenerate
 * Skill Tree does not trigger repersonalization anymore
 */
export async function repersonalize(authToken) {
  return request('/roadmaps/primary/regenerate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({}),
  });
}

const skillTreeApi = {
  getTree,
  patchNodeStatus,
  getRoadmapProgress,
  getResources,
  getWhyCourse,
  getMarketSkills,
  getLearningResources,
  getNodeResources,
  getNodeWhy,
  getNodeMarketSkills,
  getSkillLearningResources,
  repersonalize,
};

export default skillTreeApi;

