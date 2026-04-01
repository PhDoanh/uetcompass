const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

/**
 * Opens an SSE connection for roadmap notifications.
 * @param {string} sseToken
 * @returns {EventSource}
 */
export function openRoadmapNotificationStream(sseToken) {
  return new EventSource(`${API_BASE_URL}/roadmap/sse?sseToken=${encodeURIComponent(sseToken)}`);
}

/**
 * Opens an SSE connection for onboarding notifications.
 * @param {string} sseToken
 * @returns {EventSource}
 */
export function openOnboardingNotificationStream(sseToken) {
  return new EventSource(`${API_BASE_URL}/onboarding/status?sseToken=${encodeURIComponent(sseToken)}`);
}
