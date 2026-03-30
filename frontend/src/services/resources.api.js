/**
 * T018: Resources API Wrapper (User Story 1, 2, 3)
 * Centralized API client for all resource curation endpoints
 * Pattern follows Feature 001 (onboarding.api.js)
 */

const API_BASE_URL =
	import.meta?.env?.VITE_API_BASE_URL ||
	(typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

/**
 * Centralized request function
 * Handles all HTTP logic, error handling, and JSON parsing
 * @param {string} path - API path (e.g., '/resources/skills/123')
 * @param {object} options - Fetch options (method, headers, body)
 * @returns {Promise<any>} Parsed JSON response or null for 204 responses
 * @throws {Error} Enhanced error with status, code, and details
 */
async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {}),
		},
	});

	if (response.status === 204) {
		return null;
	}

	let payload = null;
	try {
		payload = await response.json();
	} catch (err) {
		payload = null;
	}

	if (!response.ok) {
		const error = new Error(payload?.error?.message || 'Request failed');
		error.status = response.status;
		error.code = payload?.error?.code;
		error.details = payload?.error?.details;
		throw error;
	}

	return payload;
}

function resolveAuthToken(authToken) {
	if (authToken) return authToken;

	try {
		return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
	} catch {
		return '';
	}
}

/**
 * Get learning resources for a specific skill
 * @param {string} skillName - Skill name
 * @param {string} authToken - JWT access token
 * @returns {Promise<object>} Learning resources response with skillName, resources array
 * @throws {Error} Error with status, code, and details if request fails
 */
export async function getSkillResources(skillName, authToken) {
  const token = resolveAuthToken(authToken);

	return request(`/resources/skills/${encodeURIComponent(skillName)}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
}

/**
 * Get academic materials for a specific course
 * @param {string} courseName - Course name
 * @param {string} authToken - JWT access token
 * @returns {Promise<object>} Academic materials response with courseName, documents array
 * @throws {Error} Error with status, code, and details if request fails
 */
export async function getAcademicMaterials(courseName, authToken) {
  const token = resolveAuthToken(authToken);

	return request(`/resources/academic/${encodeURIComponent(courseName)}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
}

/**
 * Get market trends for all skills
 * @param {string} authToken - JWT access token
 * @returns {Promise<object>} Market trends response with trends array, lastRefreshedAt timestamp
 * @throws {Error} Error with status, code, and details if request fails
 */
export async function getMarketTrends(authToken) {
	const token = resolveAuthToken(authToken);

	return request('/market/trends', {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
}

/**
 * Trigger crawl pipeline from Feature 009
 * @param {Array<{courseName: string}>} nodes - Course nodes from roadmap
 * @param {string|null} studentProfileId - Optional profile for personalization
 * @param {string} authToken - JWT access token
 * @returns {Promise<object>} Trigger response with status and summary
 */
export async function triggerResourceCuration(nodes, studentProfileId = null, authToken) {
	const token = resolveAuthToken(authToken);

	return request('/resources/crawl/trigger', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			sourceFeature: '009-roadmap-generator',
			nodes,
			studentProfileId
		})
	});
}
