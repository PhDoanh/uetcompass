import React, { useCallback, useEffect, useMemo, useState } from 'react';
import authApi from '../../services/auth.api';
import { useAuth } from '../../providers/AuthProvider';
import { retryRoadmapGeneration } from '../../services/roadmap.api';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import MajorSelect from '../onboarding/MajorSelect';
import CourseMultiSelect from '../onboarding/CourseMultiSelect';
import CareerGoalForm from '../onboarding/CareerGoalForm';
import './account-settings.css';

const EMPTY_PROFILE = { 
  major: '', 
  completedCourses: [],
  careerGoal: { role: '', companyType: '', graduationTimeline: '', }, 
  personalAspirations: '', 
};

const MAJOR_OPTIONS = ['Computer Science', 'Information Systems', 'Computer Engineering'];
const COURSE_CATALOG = {
  'Computer Science': [
    { courseCode: 'INT2204', name: 'Object Oriented Programming' },
    { courseCode: 'INT2210', name: 'Data Structures and Algorithms' },
    { courseCode: 'INT2203', name: 'Discrete Mathematics' },
    { courseCode: 'INT3117', name: 'Operating Systems' },
    { courseCode: 'INT3405', name: 'Artificial Intelligence Fundamentals' },
  ],
  'Information Systems': [
    { courseCode: 'INT3105', name: 'Database Systems' },
    { courseCode: 'INT3110', name: 'Systems Analysis and Design' },
    { courseCode: 'INT3122', name: 'Enterprise Information Systems' },
    { courseCode: 'INT3150', name: 'Business Intelligence' },
    { courseCode: 'INT3161', name: 'Project Management for IT' },
  ],
  'Computer Engineering': [
    { courseCode: 'INT3401', name: 'Digital Design' },
    { courseCode: 'INT3403', name: 'Computer Architecture' },
    { courseCode: 'INT3407', name: 'Embedded Systems' },
    { courseCode: 'INT3411', name: 'Microprocessors and Interfacing' },
    { courseCode: 'INT3415', name: 'VLSI Design Basics' },
  ],
};

function normalizeProfileForm(profile) {
  return {
    major: (profile?.major || '').trim(),
    completedCourses: Array.isArray(profile?.completedCourses) ? profile.completedCourses : [],
    careerGoal: {
      role: (profile?.careerGoal?.role || '').trim(),
      companyType: (profile?.careerGoal?.companyType || '').trim(),
      graduationTimeline: (profile?.careerGoal?.graduationTimeline || '').trim(),
    },
    personalAspirations: (profile?.personalAspirations || '').trim(),
  };
}

function serializeLearningProfile(profile) {
  const normalized = normalizeProfileForm(profile);
  const completedCourseIds = normalized.completedCourses
    .map((item) => item?.courseUnitId || item?.courseCode)
    .filter(Boolean)
    .sort();

  return JSON.stringify({
    major: normalized.major,
    completedCourseIds,
    careerGoal: normalized.careerGoal,
    personalAspirations: normalized.personalAspirations,
  });
}

function mapProfileToForm(profile) {
  const profileData = profile?.profile || {};
  const completedCourseIds = Array.isArray(profileData.completedCourseIds) ? profileData.completedCourseIds : [];
  const careerGoal = profileData.careerGoal || {};
  const major = profileData.major || '';
  return {
    major,
    completedCourses: completedCourseIds.map((courseCode) => ({ major, courseCode })),
    careerGoal: { 
      role: careerGoal.role || '', 
      companyType: careerGoal.companyType || '', 
      graduationTimeline: careerGoal.graduationTimeline || '', 
    },
    personalAspirations: profileData.personalAspirations || '',
  };
}

export default function AccountSettingsPage() {
  const { accessToken, onboardingState, logoutAndRedirect } = useAuth();
  
  const [basicForm, setBasicForm] = useState({ displayName: '', fullName: '', privacySetting: 'identified' });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [initialLearningProfileSerialized, setInitialLearningProfileSerialized] = useState(() =>
    serializeLearningProfile(EMPTY_PROFILE)
  );
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [showRegenRoadmap, setShowRegenRoadmap] = useState(false);
  const [showOnboardingPanel, setShowOnboardingPanel] = useState(false);
  const [hasSubmittedOnboarding, setHasSubmittedOnboarding] = useState(false);
  const courseOptions = useMemo(() => COURSE_CATALOG[profileForm.major] || [], [profileForm.major]);
  const currentLearningProfileSerialized = useMemo(
    () => serializeLearningProfile(profileForm),
    [profileForm]
  );
  const hasLearningProfileChanges = currentLearningProfileSerialized !== initialLearningProfileSerialized;
  const learningActionButtonCount = (hasLearningProfileChanges ? 1 : 0) + (showRegenRoadmap ? 1 : 0);

  const hasCompletedOnboarding = onboardingState === 'COMPLETED' || hasSubmittedOnboarding;

  useEffect(() => {
    if (hasLearningProfileChanges && (message || error)) {
      setMessage('');
      setError('');
    }
  }, [hasLearningProfileChanges, message, error]);

  const patchProfileForm = (nextProfileForm) => {
    setProfileForm(nextProfileForm);
  };

  const loadProfile = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await authApi.getProfile(accessToken);
      const nextProfileForm = mapProfileToForm(data);
      const completedByProfileData = Boolean(String(data?.profile?.major || '').trim());
      setBasicForm({ 
        displayName: data.displayName || '', 
        fullName: data.fullName || '', 
        privacySetting: data.privacySetting || 'identified' 
      });
      setProfileForm(nextProfileForm);
      setHasSubmittedOnboarding(completedByProfileData);
      setInitialLearningProfileSerialized(serializeLearningProfile(nextProfileForm));
    } catch (err) {
      if (err.status === 401) logoutAndRedirect();
      setError("Failed to load profile data.");
    }
  }, [accessToken, logoutAndRedirect]);

  useEffect(() => {
    if (accessToken) loadProfile();
  }, [accessToken, loadProfile]);

  const onSaveBasic = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    
    try {
      await authApi.patchProfile(accessToken, basicForm);
      setMessage('Basic information updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update basic info.');
    } finally {
      setLoading(false);
    }
  };

  const onSaveLearning = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    setShowRegenRoadmap(false);
    
    const payload = {
      profile: {
        major: profileForm.major.trim(),
        completedCourseIds: (profileForm.completedCourses || [])
          .map((item) => item?.courseUnitId || item?.courseCode)
          .filter(Boolean),
        careerGoal: {
          role: profileForm.careerGoal.role.trim(),
          companyType: profileForm.careerGoal.companyType.trim(),
          graduationTimeline: profileForm.careerGoal.graduationTimeline.trim(),
        },
        personalAspirations: profileForm.personalAspirations.trim(),
      },
    };
    
    try {
      await authApi.patchProfile(accessToken, payload);
      setMessage('Learning profile updated successfully.');
      setShowRegenRoadmap(true);
      loadProfile(); 
    } catch (err) {
      setError(err.message || 'Failed to update learning profile.');
    } finally {
      setLoading(false);
    }
  };

  const onRegenRoadmap = async () => {
    if (!accessToken) return;
    setMessage('');
    setError('');
    setRegenLoading(true);
    try {
      setShowRegenRoadmap(false);
      console.log('Triggering roadmap regeneration...');
      await retryRoadmapGeneration(accessToken);
      setMessage('Roadmap regeneration triggered successfully. It may take a few moments for changes to reflect on your roadmap.');
    } catch (err) {
      setError(err.message || 'Failed to regenerate roadmap.');
    } finally {
      setRegenLoading(false);
    }
  };

  const onSavePassword = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    try {
      await authApi.changePassword(accessToken, { ...passwordForm, action: 'changePassword' });
      setMessage('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      if (err.status === 401 && err.code === 'UNAUTHORIZED') {
        logoutAndRedirect();
        return;
      }
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="account-settings-shell">
      <h1 className="account-settings-title">Account Settings</h1>
      
      {error && <div className="status-text error">{error}</div>}

      <div className="settings-grid">
        <section className="account-settings-card">
          <h2 className="section-title">Basic Information</h2>
          <form onSubmit={onSaveBasic}>
            <label htmlFor="displayName">Display Name</label>
            <input 
              id="displayName" 
              value={basicForm.displayName} 
              onChange={(e) => setBasicForm(p => ({ ...p, displayName: e.target.value }))} 
              className="form-input"
            />
            
            <label htmlFor="fullName">Full Name *</label>
            <input 
              id="fullName" 
              value={basicForm.fullName} 
              onChange={(e) => setBasicForm(p => ({ ...p, fullName: e.target.value }))} 
              required 
              className="form-input"
            />
            
            <label htmlFor="privacySetting">Privacy Setting</label>
            <select 
              id="privacySetting" 
              value={basicForm.privacySetting} 
              onChange={(e) => setBasicForm(p => ({ ...p, privacySetting: e.target.value }))}
              className="form-input"
            >
              <option value="identified">Identified</option>
              <option value="anonymous">Anonymous</option>
            </select>
            
            <button type="submit" className="primary-btn" disabled={loading}>
              Save Basic Info
            </button>
            {message === 'Basic information updated successfully.' && (
              <div className="status-text success" style={{ marginTop: 12, marginBottom: 0 }}>
                {message}
              </div>
            )}
          </form>
        </section>

        <section className="account-settings-card">
          <h2 className="section-title">Learning Profile</h2>
          {!hasCompletedOnboarding ? (
            <div className="onboarding-prompt">
              <p>Please complete onboarding to manage your learning roadmap.</p>
              <button type="button" className="secondary-btn" onClick={() => setShowOnboardingPanel(true)}>
                Start Onboarding
              </button>
            </div>
          ) : (
            <form onSubmit={onSaveLearning}>
              <MajorSelect
                value={profileForm.major}
                selectedCourses={profileForm.completedCourses || []}
                onResetCourses={() => patchProfileForm({ ...profileForm, completedCourses: [] })}
                onChange={(major) => patchProfileForm({ ...profileForm, major })}
                majors={MAJOR_OPTIONS}
              />

              <div style={{ marginTop: 6 }}>
                <CourseMultiSelect
                  major={profileForm.major}
                  options={courseOptions}
                  value={profileForm.completedCourses || []}
                  onChange={(completedCourses) => patchProfileForm({ ...profileForm, completedCourses })}
                />
              </div>

              <CareerGoalForm
                value={profileForm}
                onChange={patchProfileForm}
              />

              {learningActionButtonCount > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: learningActionButtonCount === 2 ? 'repeat(2, 1fr)' : '1fr',
                    gap: 12,
                    maxWidth: 520,
                    alignItems: 'stretch',
                  }}
                >
                  {hasLearningProfileChanges && (
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={loading || regenLoading}
                      style={{ margin: 0, width: '100%' }}
                    >
                      Save Learning Profile
                    </button>
                  )}
                  {showRegenRoadmap && (
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={onRegenRoadmap}
                      disabled={loading || regenLoading}
                      style={{ margin: 0, width: '100%' }}
                    >
                      {regenLoading ? 'Regenerating...' : 'Regen Roadmap'}
                    </button>
                  )}
                </div>
              )}
              {message === 'Learning profile updated successfully.' && (
                <div className="status-text success" style={{ marginTop: 12, marginBottom: 0 }}>
                  {message}
                </div>
              )}
              {message === 'Roadmap regeneration triggered successfully. It may take a few moments for changes to reflect on your roadmap.' && (
                <div className="status-text success" style={{ marginTop: 12, marginBottom: 0 }}>
                  {message}
                </div>
              )}
            </form>
          )}
        </section>

        <section className="account-settings-card">
          <h2 className="section-title">Security</h2>
          <form onSubmit={onSavePassword}>
            <label htmlFor="currentPassword">Current Password</label>
            <input 
              id="currentPassword" 
              type="password" 
              value={passwordForm.currentPassword} 
              onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
              className="form-input"
            />

            <label htmlFor="newPassword">New Password</label>
            <input 
              id="newPassword" 
              type="password" 
              value={passwordForm.newPassword} 
              onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
              className="form-input"
            />
            
            <button type="submit" className="secondary-btn btn-danger" disabled={loading}>
              Change Password
            </button>
            {message === 'Password changed successfully.' && (
              <div className="status-text success" style={{ marginTop: 12, marginBottom: 0 }}>
                {message}
              </div>
            )}
          </form>
        </section>
      </div>

      {showOnboardingPanel && (
        <div className="onboarding-modal-overlay">
          <OnboardingPanel
            authToken={accessToken}
            onUnauthorized={logoutAndRedirect}
            onCompleted={() => setHasSubmittedOnboarding(true)}
            onClose={() => { setShowOnboardingPanel(false); loadProfile(); }}
          />
        </div>
      )}
    </main>
  );
}