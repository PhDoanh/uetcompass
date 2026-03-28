import axios from 'axios';

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const client = axios.create({ baseURL: API_BASE });

// Track auth token from localStorage or context
function getAuthToken() {
  return localStorage.getItem('authToken') || '';
}

function createHeaders() {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
  };
}

// Helper: convert API errors to structured objects
function handleError(err) {
  if (err.response) {
    const { status, data } = err.response;
    const error = new Error(data.message || data.error || 'Unknown error');
    error.status = status;
    error.code = data.error || 'UNKNOWN';
    error.details = data.details || {};
    throw error;
  }
  throw err;
}

export async function getTree(authToken) {
  try {
    const response = await client.get('/skill-tree', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function patchNodeStatus(authToken, courseCode, status) {
  try {
    const response = await client.patch(`/skill-tree/nodes/${courseCode}/status`, { status }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getResources(authToken, courseCode) {
  try {
    const response = await client.get(`/skill-tree/nodes/${courseCode}/resources`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getWhyCourse(authToken, courseCode) {
  try {
    const response = await client.get(`/skill-tree/nodes/${courseCode}/why`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getMarketSkills(authToken, courseCode) {
  try {
    const response = await client.get(`/skill-tree/nodes/${courseCode}/market-skills`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getLearningResources(authToken, skillName) {
  try {
    const response = await client.get(`/skill-tree/skills/${encodeURIComponent(skillName)}/learning-resources`, {
      headers: { Authorization: `Bearer ${authToken}` },
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
