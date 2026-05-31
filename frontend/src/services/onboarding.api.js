const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
	(typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

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
	} catch {
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

export async function getDraft(authToken) {
	return request('/onboarding/draft', {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
}

export async function getCourseCatalog(authToken) {
	const headers = authToken
		? {
			Authorization: `Bearer ${authToken}`,
		}
		: {};

	return request('/onboarding/course-catalog', {
		method: 'GET',
		headers,
	});
}

export async function putDraft(authToken, payload) {
	return request('/onboarding/draft', {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify(payload || {}),
	});
}

export async function postSubmit(authToken, payload) {
	return request('/onboarding/submit', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify(payload || {}),
	});
}

export function openStatusStream(sseToken) {
	return new EventSource(`${API_BASE_URL}/onboarding/status?sseToken=${encodeURIComponent(sseToken)}`);
}
