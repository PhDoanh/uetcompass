import React, { createContext, useContext, useMemo, useState } from 'react';
import authApi from '../services/auth.api';

const AuthContext = createContext(null);

export function sanitizeOnboardingDraft(draft) {
  const source = draft && typeof draft === 'object' ? draft : {};
  const careerGoal = source.careerGoal && typeof source.careerGoal === 'object' ? source.careerGoal : {};

  return {
    major: source.major || null,
    completedCourseIds: Array.isArray(source.completedCourseIds) ? source.completedCourseIds : [],
    careerGoal: {
      role: careerGoal.role || null,
      companyType: careerGoal.companyType || null,
      graduationTimeline: careerGoal.graduationTimeline || null,
    },
    personalAspirations: source.personalAspirations || null,
  };
}

export function decidePostLoginRoute(onboardingState) {
  if (onboardingState === 'COMPLETED') {
    return '/skill-tree';
  }
  return '/';
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('authToken') || null;
  });
  const [onboardingState, setOnboardingState] = useState(() => {
    if (typeof window === 'undefined') {
      return 'NEVER_STARTED';
    }
    return window.localStorage.getItem('onboardingState') || 'NEVER_STARTED';
  });
  const [onboardingDraft, setOnboardingDraft] = useState(null);

  const value = useMemo(
    () => ({
      accessToken,
      onboardingState,
      onboardingDraft,
      isAuthenticated: Boolean(accessToken),
      applyLoginResult: (result) => {
        const nextToken = result?.accessToken || null;
        const nextState = result?.onboardingState || 'NEVER_STARTED';
        const nextDraft = result?.onboardingDraft ? sanitizeOnboardingDraft(result.onboardingDraft) : null;

        setAccessToken(nextToken);
        setOnboardingState(nextState);
        setOnboardingDraft(nextDraft);

        if (typeof window !== 'undefined') {
          if (nextToken) {
            window.localStorage.setItem('authToken', nextToken);
          } else {
            window.localStorage.removeItem('authToken');
          }

          window.localStorage.setItem('onboardingState', nextState);
          window.localStorage.setItem('onboardingCompleted', String(nextState === 'COMPLETED'));
        }
      },
      logout: () => {
        setAccessToken(null);
        setOnboardingState('NEVER_STARTED');
        setOnboardingDraft(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('authToken');
          window.localStorage.removeItem('onboardingState');
          window.localStorage.removeItem('onboardingCompleted');
        }
      },
      handleAccountDeleted: () => {
        setAccessToken(null);
        setOnboardingState('NEVER_STARTED');
        setOnboardingDraft(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('authToken');
          window.localStorage.removeItem('onboardingState');
          window.localStorage.removeItem('onboardingCompleted');
        }
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
      },
      logoutAndRedirect: async () => {
        try {
          await authApi.logout();
        } catch (_) {
          // Always clear local auth state even if server logout fails.
        }

        setAccessToken(null);
        setOnboardingState('NEVER_STARTED');
        setOnboardingDraft(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('authToken');
          window.localStorage.removeItem('onboardingState');
          window.localStorage.removeItem('onboardingCompleted');
          window.location.assign('/login');
        }
      },
    }),
    [accessToken, onboardingDraft, onboardingState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
