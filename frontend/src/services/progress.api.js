const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

function createError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function request(path, authToken) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || 'Progress API request failed';
    const code = payload?.error?.code || 'INTERNAL_ERROR';
    throw createError(message, response.status, code);
  }

  return payload;
}

export async function getSummaries(authToken) {
  const payload = await request('/progress/summaries', authToken);
  return (payload?.roadmaps || []).map((item) => {
    const roadmapId = String(item?.roadmapId || '').trim();
    const roadmapSource = String(item?.roadmapSource || (item?.isPrimary ? 'primary' : 'roadmap') || '').trim() || 'roadmap';
    return {
      ...item,
      roadmapId,
      roadmapSource,
      roadmapKey: item?.roadmapKey || `${roadmapSource}:${roadmapId}`,
    };
  });
}

export async function getRoadmapNodes(authToken, roadmapId) {
  return request(`/progress/summaries/${encodeURIComponent(roadmapId)}/nodes`, authToken);
}

export async function getTrackingTables(authToken, { scope, roadmapId, groupBy }) {
  const params = new URLSearchParams();
  if (scope) {
    params.set('scope', scope);
  }
  if (groupBy) {
    params.set('groupBy', groupBy);
  }
  if (roadmapId) {
    params.set('roadmapId', roadmapId);
  }
  const query = params.toString();
  return request(`/progress/tracking${query ? `?${query}` : ''}`, authToken);
}

export function buildProgressSseUrl(sseToken) {
  return `${API_BASE_URL}/progress/sse?sseToken=${encodeURIComponent(sseToken)}`;
}
