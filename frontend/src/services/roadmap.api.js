const API_BASE_URL =
	import.meta?.env?.VITE_API_BASE_URL ||
	(typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

export async function retryRoadmapGeneration(authToken) {
	const response = await fetch(`${API_BASE_URL}/roadmap/retry`, {
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
