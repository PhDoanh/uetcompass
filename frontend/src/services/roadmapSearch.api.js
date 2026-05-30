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
    } catch {
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

export function searchPublicRoadmaps({ q = '', tags = [], page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) {
        params.set('q', q);
    }
    if (Array.isArray(tags) && tags.length > 0) {
        tags.forEach(tag => {
            params.append('tags', String(tag || '').trim().toLowerCase());
        });
    }
    return request(`/roadmaps/manual-roadmaps/public?${params.toString()}`, 'GET');
}

export function getManualRoadmapTags() {
    return request('/roadmaps/manual-roadmaps/tags', 'GET');
}

export function getPublicRoadmapPreviewById(roadmapId) {
    return request(`/roadmaps/manual-roadmaps/public/${roadmapId}`, 'GET');
}

const roadmapSearchApi = {
    searchPublicRoadmaps,
    getPublicRoadmapPreviewById,
    getManualRoadmapTags,
};

export default roadmapSearchApi;
