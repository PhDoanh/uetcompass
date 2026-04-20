const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

async function request(path, method, authToken, body, { requireAuth = true } = {}) {
    const token = typeof authToken === 'string' ? authToken.trim() : '';
    if (requireAuth && !token) {
        const error = new Error('Authentication required. Please sign in again.');
        error.status = 401;
        error.code = 'UNAUTHORIZED';
        throw error;
    }

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (err) {
        payload = null;
    }

    if (!response.ok) {
        const error = new Error(
            response.status === 401
                ? 'Your session has expired. Please sign in again.'
                : (payload?.error?.message || 'Manual roadmap request failed')
        );
        error.status = response.status;
        error.code = payload?.error?.code;
        throw error;
    }

    return payload;
}

export function listManualRoadmaps(authToken, { page = 1, limit = 20 } = {}) {
    return request(`/roadmaps/manual-roadmaps?page=${page}&limit=${limit}`, 'GET', authToken);
}

export function getManualRoadmap(authToken, roadmapId) {
    return request(`/roadmaps/manual-roadmaps/${roadmapId}`, 'GET', authToken);
}

export function createManualRoadmap(authToken, { yamlCode }) {
    return request('/roadmaps/manual-roadmaps', 'POST', authToken, { yamlCode });
}

export function updateManualRoadmap(authToken, roadmapId, { yamlCode }) {
    return request(`/roadmaps/manual-roadmaps/${roadmapId}`, 'PATCH', authToken, { yamlCode });
}

export function shareManualRoadmap(authToken, roadmapId) {
    return request(`/roadmaps/manual-roadmaps/${roadmapId}/share`, 'POST', authToken);
}

export function listPublicManualRoadmaps({ q = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    const normalizedQuery = String(q || '').trim();
    if (normalizedQuery) {
        params.set('q', normalizedQuery);
    }

    return request(`/roadmaps/manual-roadmaps/public?${params.toString()}`, 'GET', null, undefined, { requireAuth: false });
}

export function getPublicManualRoadmapPreviewById(roadmapId) {
    return request(`/roadmaps/manual-roadmaps/public/${roadmapId}`, 'GET', null, undefined, { requireAuth: false });
}

const manualRoadmapApi = {
    listManualRoadmaps,
    getManualRoadmap,
    createManualRoadmap,
    updateManualRoadmap,
    shareManualRoadmap,
    listPublicManualRoadmaps,
    getPublicManualRoadmapPreviewById,
};

export default manualRoadmapApi;
