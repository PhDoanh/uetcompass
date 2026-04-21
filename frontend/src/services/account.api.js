const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

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
    const error = new Error(payload?.error?.message || 'Request failed');
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload;
}

function requestAuthed(path, token, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export function getProfile(token) {
  return requestAuthed('/account/profile', token, { method: 'GET' });
}

export function updateProfile(token, payload) {
  return requestAuthed('/account/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function changePassword(token, payload) {
  return requestAuthed('/account/password/change', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteAccount(token) {
  return requestAuthed('/account/hard-delete', token, {
    method: 'DELETE',
  });
}

export default {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
