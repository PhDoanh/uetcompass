const API_BASE_URL =
	import.meta?.env?.VITE_API_BASE_URL ||
	(typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

/**
 * Get the current primary roadmap for the authenticated user
 * @param {string} authToken - JWT auth token
 * @returns {Promise<Object>} - Current primary roadmap
 */
export async function getPrimaryRoadmap(authToken) {
	const response = await fetch(`${API_BASE_URL}/roadmaps/primary`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch (err) {
		payload = null;
	}

	if (!response.ok) {
		const error = new Error(payload?.error?.message || 'Failed to fetch roadmap');
		error.status = response.status;
		error.code = payload?.error?.code;
		throw error;
	}

	return payload;
}

/**
 * Retry roadmap generation after a failure or request regeneration
 * @param {string} authToken - JWT auth token
 * @returns {Promise<Object>} - Generation triggered response
 */
export async function retryRoadmapGeneration(authToken) {
	const response = await fetch(`${API_BASE_URL}/roadmaps/primary/regenerate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch (err) {
		payload = null;
	}

	if (!response.ok) {
		const error = new Error(payload?.error?.message || 'Retry failed');
		error.status = response.status;
		error.code = payload?.error?.code;
		throw error;
	}

	return payload;
}
