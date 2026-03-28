import React, { useEffect, useState } from 'react';
import authApi from './auth.api';
import { useAuth } from '../../providers/AuthProvider';

const EMPTY_PROFILE = {
  major: '',
  completedCourseIdsText: '',
  careerGoal: {
    role: '',
    companyType: '',
    graduationTimeline: '',
  },
  personalAspirations: '',
};

export default function AccountSettingsPage() {
  const { accessToken, handleAccountDeleted, onboardingState } = useAuth();
  const [form, setForm] = useState({ displayName: '', fullName: '', privacySetting: 'identified' });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
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

        const profileData = profile.profile || {};
        const completedCourseIds = Array.isArray(profileData.completedCourseIds) ? profileData.completedCourseIds : [];
        const careerGoal = profileData.careerGoal || {};
        setProfileForm({
          major: profileData.major || '',
          completedCourseIdsText: completedCourseIds.join(', '),
          careerGoal: {
            role: careerGoal.role || '',
            companyType: careerGoal.companyType || '',
            graduationTimeline: careerGoal.graduationTimeline || '',
          },
          personalAspirations: profileData.personalAspirations || '',
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

    const profilePayload = {
      major: profileForm.major.trim(),
      completedCourseIds: profileForm.completedCourseIdsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      careerGoal: {
        role: profileForm.careerGoal.role.trim(),
        companyType: profileForm.careerGoal.companyType.trim(),
        graduationTimeline: profileForm.careerGoal.graduationTimeline.trim(),
      },
      personalAspirations: profileForm.personalAspirations.trim(),
    };

    const payload = {
      ...form,
      ...(onboardingState === 'COMPLETED' ? { profile: profilePayload } : {}),
    };

    try {
      await authApi.patchProfile(accessToken, payload);
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

  const hasOnboardingSnapshot =
    Boolean(profileForm.major) ||
    Boolean(profileForm.completedCourseIdsText.trim()) ||
    Boolean(profileForm.careerGoal.role) ||
    Boolean(profileForm.careerGoal.companyType) ||
    Boolean(profileForm.careerGoal.graduationTimeline) ||
    Boolean(profileForm.personalAspirations.trim());

  const showCompletedEditor = onboardingState === 'COMPLETED';
  const showNeverStartedState = onboardingState === 'NEVER_STARTED';
  const showDraftState = onboardingState === 'DRAFT_IN_PROGRESS';

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

        <section style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #ddd' }}>
          <h2 style={{ marginTop: 0 }}>Learning profile</h2>
          {showNeverStartedState ? (
            <div style={{ border: '1px solid #f6d28b', background: '#fff9ed', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                You have not started onboarding yet. Onboarding information is currently empty.
              </p>
              <p style={{ marginTop: 0, marginBottom: 8, color: '#666' }}>
                Start onboarding from the home page to fill major, completed courses, and career goals.
              </p>
              <a href="/">Open onboarding</a>
            </div>
          ) : null}

          {showDraftState ? (
            <div style={{ border: '1px solid #cfe4ff', background: '#f5f9ff', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                You have an onboarding draft in progress.
              </p>
              <p style={{ marginTop: 0, marginBottom: 8, color: '#666' }}>
                Continue onboarding from the home page to submit before editing here.
              </p>
              <a href="/">Continue onboarding</a>
            </div>
          ) : null}

          {!showCompletedEditor ? (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Current onboarding info</strong></p>
              <p style={{ margin: '4px 0' }}>Major: {profileForm.major || 'Not provided yet'}</p>
              <p style={{ margin: '4px 0' }}>
                Completed courses: {profileForm.completedCourseIdsText.trim() || 'Not provided yet'}
              </p>
              <p style={{ margin: '4px 0' }}>Target role: {profileForm.careerGoal.role || 'Not provided yet'}</p>
              <p style={{ margin: '4px 0' }}>
                Target company type: {profileForm.careerGoal.companyType || 'Not provided yet'}
              </p>
              <p style={{ margin: '4px 0' }}>
                Graduation timeline: {profileForm.careerGoal.graduationTimeline || 'Not provided yet'}
              </p>
              <p style={{ margin: '4px 0' }}>
                Personal aspirations: {profileForm.personalAspirations.trim() || 'Not provided yet'}
              </p>
              {!hasOnboardingSnapshot ? (
                <p style={{ marginTop: 8, marginBottom: 0, color: '#666' }}>
                  No onboarding draft found for this account yet.
                </p>
              ) : null}
            </div>
          ) : null}

          {showCompletedEditor ? (
            <>
              <label htmlFor="major">Major</label>
              <input
                id="major"
                value={profileForm.major}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    major: event.target.value,
                  }))
                }
                style={{ width: '100%', marginBottom: 12 }}
              />

              <label htmlFor="completedCourseIds">Completed courses (comma separated)</label>
              <input
                id="completedCourseIds"
                value={profileForm.completedCourseIdsText}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    completedCourseIdsText: event.target.value,
                  }))
                }
                style={{ width: '100%', marginBottom: 12 }}
              />

              <label htmlFor="careerRole">Target role</label>
              <input
                id="careerRole"
                value={profileForm.careerGoal.role}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    careerGoal: { ...prev.careerGoal, role: event.target.value },
                  }))
                }
                style={{ width: '100%', marginBottom: 12 }}
              />

              <label htmlFor="companyType">Target company type</label>
              <input
                id="companyType"
                value={profileForm.careerGoal.companyType}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    careerGoal: { ...prev.careerGoal, companyType: event.target.value },
                  }))
                }
                style={{ width: '100%', marginBottom: 12 }}
              />

              <label htmlFor="graduationTimeline">Graduation timeline</label>
              <input
                id="graduationTimeline"
                value={profileForm.careerGoal.graduationTimeline}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    careerGoal: { ...prev.careerGoal, graduationTimeline: event.target.value },
                  }))
                }
                style={{ width: '100%', marginBottom: 12 }}
              />

              <label htmlFor="personalAspirations">Personal aspirations</label>
              <textarea
                id="personalAspirations"
                value={profileForm.personalAspirations}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    personalAspirations: event.target.value,
                  }))
                }
                rows={4}
                style={{ width: '100%', marginBottom: 12 }}
              />
            </>
          ) : null}
        </section>
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
