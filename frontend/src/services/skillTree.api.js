import axios from 'axios';

const API_BASE = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:3001/api';
const client = axios.create({ baseURL: API_BASE });

function getDevUserId() {
  return import.meta?.env?.VITE_SKILL_TREE_DEV_USER_ID || '000000000000000000000001';
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

// Helper: convert API errors to structured objects
function handleError(err) {
  if (err.response) {
    const { status, data } = err.response;
    const message = data?.error?.message || data?.message || 'Unknown error';
    const code = data?.error?.code || data?.code || 'UNKNOWN';
    const details = data?.error?.details || data?.details || {};
    const error = new Error(message);
    error.status = status;
    error.code = code;
    error.details = details;
    throw error;
  }
  throw err;
}

export async function getTree(authToken) {
  try {
    const response = await client.get('/skill-tree', {
      headers: createHeaders(authToken),
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function patchNodeStatus(authToken, courseCode, status) {
  try {
    const response = await client.patch(`/skill-tree/nodes/${courseCode}/status`, { status }, {
      headers: createHeaders(authToken),
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getResources(authToken, courseCode) {
  try {
    const response = await client.get(`/skill-tree/nodes/${courseCode}/resources`, {
      headers: createHeaders(authToken),
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getWhyCourse(authToken, courseCode) {
  try {
    const response = await client.get(`/skill-tree/nodes/${courseCode}/why`, {
      headers: createHeaders(authToken),
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getMarketSkills(authToken, courseCode) {
  try {
    const response = await client.get(`/skill-tree/nodes/${courseCode}/market-skills`, {
      headers: createHeaders(authToken),
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getLearningResources(authToken, skillName) {
  try {
    const response = await client.get(`/skill-tree/skills/${encodeURIComponent(skillName)}/learning-resources`, {
      headers: createHeaders(authToken),
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

/**
 * Note: Repersonalization is handled by Feature 005 (Account Management)
 * Feature 005 calls Feature 009 endpoint directly: POST /api/roadmaps/primary/regenerate
 * Skill Tree does not trigger repersonalization anymore
 */
// export async function repersonalize(authToken) {
//   try {
//     const response = await client.post('/roadmaps/primary/regenerate', {}, {
//       headers: { Authorization: `Bearer ${authToken}` },
//     });
//     return response.data;
//   } catch (err) {
//     handleError(err);
//   }
// }

