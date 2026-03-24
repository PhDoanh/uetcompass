import React, { useEffect, useState } from 'react';
import authApi from './auth.api';
import { useAuth } from '../../providers/AuthProvider';

export default function AccountSettingsPage() {
  const { accessToken, handleAccountDeleted } = useAuth();
  const [form, setForm] = useState({ displayName: '', fullName: '', privacySetting: 'identified' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    authApi
      .getProfile(accessToken)
      .then((profile) => {
        setForm({
          displayName: profile.displayName || '',
          fullName: profile.fullName || '',
          privacySetting: profile.privacySetting || 'identified',
        });
      })
      .catch((err) => setError(err.message || 'Failed to load profile.'));

    authApi
      .getNotifications(accessToken, false)
      .then((data) => setNotifications(Array.isArray(data.notifications) ? data.notifications : []))
      .catch(() => {});
  }, [accessToken]);

  async function submitProfile(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await authApi.patchProfile(accessToken, form);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    }
  }

  async function markRead(notificationId) {
    try {
      await authApi.markNotificationRead(accessToken, notificationId);
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
    } catch {
      // ignore
    }
  }

  async function submitChangePassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const result = await authApi.changePassword(accessToken, passwordForm);
      setMessage(result.message || 'Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    }
  }

  async function triggerDeletionRequest() {
    setError('');
    setMessage('');

    try {
      const result = await authApi.requestDeletion(accessToken);
      setMessage(result.message || 'Deletion confirmation email sent.');
    } catch (err) {
      setError(err.message || 'Failed to request account deletion.');
    }
  }

  async function confirmDeletionByPrompt() {
    const token = typeof window !== 'undefined' ? window.prompt('Enter deletion token from confirmation link:') : '';
    if (!token) {
      return;
    }

    try {
      await authApi.confirmDeletion(token);
      handleAccountDeleted();
    } catch (err) {
      setError(err.message || 'Failed to confirm account deletion.');
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: 16 }}>
      <h1>Account Settings</h1>

      <form onSubmit={submitProfile}>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          value={form.displayName}
          onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
          style={{ width: '100%', marginBottom: 12 }}
        />

        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          value={form.fullName}
          onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          style={{ width: '100%', marginBottom: 12 }}
        />

        <label htmlFor="privacySetting">Privacy setting</label>
        <select
          id="privacySetting"
          value={form.privacySetting}
          onChange={(event) => setForm((prev) => ({ ...prev, privacySetting: event.target.value }))}
          style={{ width: '100%', marginBottom: 12 }}
        >
          <option value="identified">identified</option>
          <option value="anonymous">anonymous</option>
        </select>

        <button type="submit">Save profile</button>
      </form>

      <section style={{ marginTop: 24 }}>
        <h2>Security</h2>
        <form onSubmit={submitChangePassword}>
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
            }
            style={{ width: '100%', marginBottom: 12 }}
          />
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button type="submit">Change password</button>
        </form>

        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={triggerDeletionRequest}>
            Request account deletion
          </button>
          <button type="button" onClick={confirmDeletionByPrompt} style={{ marginLeft: 8 }}>
            Confirm deletion (token)
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Notifications</h2>
        {notifications.length === 0 ? <p>No unread notifications.</p> : null}
        {notifications.map((item) => (
          <div key={item._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <p style={{ margin: 0 }}>{item.message}</p>
            {item.link ? (
              <a href={item.link} style={{ display: 'inline-block', marginTop: 8 }}>
                Open link
              </a>
            ) : null}
            <div>
              <button type="button" onClick={() => markRead(item._id)} style={{ marginTop: 8 }}>
                Mark as read
              </button>
            </div>
          </div>
        ))}
      </section>

      {message ? <p>{message}</p> : null}
      {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
    </main>
  );
}
