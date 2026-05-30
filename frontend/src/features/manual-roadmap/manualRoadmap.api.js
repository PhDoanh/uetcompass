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

export function createManualRoadmap(authToken, { yamlCode, tags = [] }) {
    return request('/roadmaps/manual-roadmaps', 'POST', authToken, { yamlCode, tags });
}

export function updateManualRoadmap(authToken, roadmapId, { yamlCode, tags = [] }) {
    return request(`/roadmaps/manual-roadmaps/${roadmapId}`, 'PATCH', authToken, { yamlCode, tags });
}

export function deleteManualRoadmap(authToken, roadmapId) {
    return request(`/roadmaps/manual-roadmaps/${roadmapId}`, 'DELETE', authToken);
}

export function shareManualRoadmap(authToken, roadmapId) {
    return request(`/roadmaps/manual-roadmaps/${roadmapId}/share`, 'POST', authToken);
}

export function listPublicManualRoadmaps({ q = '', tags = [], userId = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    const normalizedQuery = String(q || '').trim();
    if (normalizedQuery) {
        params.set('q', normalizedQuery);
    }

    if (Array.isArray(tags) && tags.length > 0) {
        tags.forEach(tag => {
            params.append('tags', String(tag || '').trim().toLowerCase());
        });
    }

    const normalizedUserId = String(userId || '').trim();
    if (normalizedUserId) {
        params.set('userId', normalizedUserId);
    }

    return request(`/roadmaps/manual-roadmaps/public?${params.toString()}`, 'GET', null, undefined, { requireAuth: false });
}

export function getManualRoadmapTags() {
    return request('/roadmaps/manual-roadmaps/tags', 'GET', null, undefined, { requireAuth: false });
}

export function getPublicManualRoadmapPreviewById(roadmapId) {
    return request(`/roadmaps/manual-roadmaps/public/${roadmapId}`, 'GET', null, undefined, { requireAuth: false });
}

export function listPublicManualRoadmapComments(roadmapId, limit = 20) {
    return request(
        `/roadmaps/manual-roadmaps/${roadmapId}/comments?limit=${encodeURIComponent(limit)}`,
        'GET',
        null,
        undefined,
        { requireAuth: false }
    );
}

export function createManualRoadmapComment(authToken, roadmapId, { content, rating }) {
    return request(
        `/roadmaps/manual-roadmaps/${roadmapId}/comments`,
        'POST',
        authToken,
        { content, rating }
    );
}

export function listRoadmapVersions(authToken, roadmapId, { page = 1, limit = 50 } = {}) {
    return request(
        `/roadmaps/manual-roadmaps/${roadmapId}/versions?page=${page}&limit=${limit}`,
        'GET',
        authToken
    );
}

export function getRoadmapVersion(authToken, roadmapId, versionId) {
    return request(
        `/roadmaps/manual-roadmaps/${roadmapId}/versions/${versionId}`,
        'GET',
        authToken
    );
}

export function revertRoadmapVersion(authToken, roadmapId, versionId) {
    return request(
        `/roadmaps/manual-roadmaps/${roadmapId}/versions/${versionId}/revert`,
        'POST',
        authToken
    );
}

const manualRoadmapApi = {
    listManualRoadmaps,
    getManualRoadmap,
    createManualRoadmap,
    updateManualRoadmap,
    deleteManualRoadmap,
    shareManualRoadmap,
    listPublicManualRoadmaps,
    getPublicManualRoadmapPreviewById,
    listPublicManualRoadmapComments,
    createManualRoadmapComment,
    getManualRoadmapTags,
    listRoadmapVersions,
    getRoadmapVersion,
    revertRoadmapVersion,
};

export default manualRoadmapApi;
