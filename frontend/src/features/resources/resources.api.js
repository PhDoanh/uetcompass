/**
 * T018: Resources API Wrapper (User Story 1, 2, 3)
 * Centralized API client for all resource curation endpoints
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Get academic materials for a specific course node
 * @param {string} roadmapNodeId - The roadmap node ID
 * @returns {Promise<object>} Academic materials response
 */
export async function getAcademicMaterials(roadmapNodeId) {
  try {
    const response = await fetch(
      `${API_URL}/academic/node/${roadmapNodeId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      if (response.status === 404) {
        return { roadmapNodeId, courseName: null, documentCount: 0, documents: [] };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[ResourcesAPI] Failed to fetch academic materials:', error);
    return { roadmapNodeId, courseName: null, documentCount: 0, documents: [], error: error.message };
  }
}

/**
 * Get market trends (all skills)
 * @returns {Promise<object>} Market trends response
 */
export async function getMarketTrends() {
  try {
    const response = await fetch(
      `${API_URL}/market/trends`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[ResourcesAPI] Failed to fetch market trends:', error);
    return { lastRefreshedAt: null, trends: [], error: error.message };
  }
}

/**
 * Get learning resources for a skill
 * @param {string} skillName - The skill name
 * @returns {Promise<object>} Learning resources response
 */
export async function getSkillResources(skillName) {
  try {
    const response = await fetch(
      `${API_URL}/resources/skills/${encodeURIComponent(skillName)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      if (response.status === 404) {
        return { skillName, resourceCount: 0, resources: [] };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[ResourcesAPI] Failed to fetch skill resources:', error);
    return { skillName, resourceCount: 0, resources: [], error: error.message };
  }
}

export default {
  getAcademicMaterials,
  getMarketTrends,
  getSkillResources
};
