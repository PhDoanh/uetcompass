const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ||
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
    const message = payload?.error?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload;
}

async function requestAuthed(path, token, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function register(body) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function verifyEmail(body) {
  return request('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function resendOtp(body) {
  return request('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function login(body) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function googleLogin(body) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function forgotPassword(body) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function verifyResetOtp(body) {
  return request('/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function resetPassword(body) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function getProfile(token) {
  return requestAuthed('/account/profile', token, {
    method: 'GET',
  });
}

function patchProfile(token, body) {
  return requestAuthed('/account/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function getNotifications(token, read) {
  const query = read == null ? '' : `?read=${read ? 'true' : 'false'}`;
  return requestAuthed(`/notifications${query}`, token, {
    method: 'GET',
  });
}

function markNotificationRead(token, notificationId) {
  return requestAuthed(`/notifications/${notificationId}/read`, token, {
    method: 'PATCH',
  });
}

function changePassword(token, body) {
  return requestAuthed('/account/password/change', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function linkGoogle(token, body) {
  return requestAuthed('/account/link-google', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function unlinkGoogle(token, googleId) {
  return requestAuthed(`/account/link-google/${googleId}`, token, {
    method: 'DELETE',
  });
}

function logout() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

const authApi = {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleLogin,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getProfile,
  patchProfile,
  getNotifications,
  markNotificationRead,
  changePassword,
  linkGoogle,
  unlinkGoogle,
  logout,
};

export default authApi;
