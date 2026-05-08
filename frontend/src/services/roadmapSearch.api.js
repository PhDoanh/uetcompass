const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

async function request(path, method = 'GET') {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (_) {
        payload = null;
    }

    if (!response.ok) {
        const error = new Error(payload?.error?.message || 'Roadmap search request failed');
        error.status = response.status;
        error.code = payload?.error?.code;
        throw error;
    }

    return payload;
}

export function searchPublicRoadmaps({ q = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) {
        params.set('q', q);
    }
    return request(`/roadmaps/manual-roadmaps/public?${params.toString()}`, 'GET');
}

export function getPublicRoadmapPreviewById(roadmapId) {
    return request(`/roadmaps/manual-roadmaps/public/${roadmapId}`, 'GET');
}

const roadmapSearchApi = {
    searchPublicRoadmaps,
    getPublicRoadmapPreviewById,
};

export default roadmapSearchApi;
