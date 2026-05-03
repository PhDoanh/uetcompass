const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

async function request(path, options = {}) {
	const headers = {
		...(options.headers || {}),
	};

	if (!(options.body instanceof FormData) && !headers['Content-Type']) {
		headers['Content-Type'] = 'application/json';
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		credentials: 'include',
		headers,
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = payload?.error?.message || 'Request failed';
		const error = new Error(message);
		error.status = response.status;
		error.code = payload?.error?.code;
		error.details = payload?.error?.details;
		throw error;
	}

	return payload;
}

async function requestAuthed(path, token, options = {}) {
	return request(path, {
		...options,
		headers: {
			...(options.headers || {}),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	});
}

export { API_BASE_URL, request, requestAuthed };