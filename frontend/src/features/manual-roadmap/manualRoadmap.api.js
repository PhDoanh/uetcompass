const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

async function request(path, method, authToken, body) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (err) {
        payload = null;
    }

    if (!response.ok) {
        const error = new Error(payload?.error?.message || 'Manual roadmap request failed');
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

export function listPublicManualRoadmaps({ page = 1, limit = 20 } = {}) {
    return request(`/roadmaps/manual-roadmaps/public?page=${page}&limit=${limit}`, 'GET');
}

const manualRoadmapApi = {
    listManualRoadmaps,
    getManualRoadmap,
    createManualRoadmap,
    updateManualRoadmap,
    shareManualRoadmap,
    listPublicManualRoadmaps,
};

export default manualRoadmapApi;
