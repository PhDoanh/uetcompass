const API_BASE_URL =
	import.meta?.env?.VITE_API_BASE_URL ||
	(typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

function buildError(response, payload, fallback) {
	const error = new Error(payload?.error?.message || fallback);
	error.status = response.status;
	error.code = payload?.error?.code;
	return error;
}

async function parseJson(response) {
	try {
		return await response.json();
	} catch (err) {
		return null;
	}
}

export async function createShareLink(authToken) {
	const response = await fetch(`${API_BASE_URL}/community/share-links`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to create share link');
	return payload;
}

export async function updateShareLinkAccess(authToken, token, body) {
	const response = await fetch(`${API_BASE_URL}/community/share-links/${token}/access`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify(body),
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to update access mode');
	return payload;
}

export async function revokeShareLink(authToken, token) {
	const response = await fetch(`${API_BASE_URL}/community/share-links/${token}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	if (!response.ok) {
		const payload = await parseJson(response);
		throw buildError(response, payload, 'Failed to revoke share link');
	}
}

export async function getShareLinkSnapshot(token, authToken) {
	const headers = {};
	if (authToken) headers.Authorization = `Bearer ${authToken}`;
	const response = await fetch(`${API_BASE_URL}/community/share-links/${token}`, { headers });
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to load share snapshot');
	return payload;
}

export async function publishPost(authToken, sharedRoadmapId) {
	const response = await fetch(`${API_BASE_URL}/community/posts`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify({ sharedRoadmapId }),
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to publish post');
	return payload;
}

export async function unpublishMyPost(authToken) {
	const response = await fetch(`${API_BASE_URL}/community/posts/me`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	if (!response.ok) {
		const payload = await parseJson(response);
		throw buildError(response, payload, 'Failed to unpublish post');
	}
}

export async function listPosts(authToken, query = {}) {
	const qs = new URLSearchParams();
	Object.entries(query).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') qs.set(key, value);
	});
	const response = await fetch(`${API_BASE_URL}/community/posts?${qs.toString()}`, {
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to fetch community posts');
	return payload;
}

export async function getPostDetail(authToken, postId) {
	const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to fetch post detail');
	return payload;
}

export async function likePost(authToken, postId) {
	const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/likes`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to like post');
	return payload;
}

export async function unlikePost(authToken, postId) {
	const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/likes`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to unlike post');
	return payload;
}

export async function forkPost(authToken, postId) {
	const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/fork`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});
	const payload = await parseJson(response);
	if (!response.ok) throw buildError(response, payload, 'Failed to fork post');
	return payload;
}
