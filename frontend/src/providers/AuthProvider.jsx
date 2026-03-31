import React, { createContext, useContext, useMemo, useState } from 'react';
import authApi from '../services/auth.api';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'authState';

function readStoredAuthState() {
  if (typeof window === 'undefined') {
    return {
      accessToken: null,
      onboardingState: 'NEVER_STARTED',
      onboardingDraft: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return {
        accessToken: null,
        onboardingState: 'NEVER_STARTED',
        onboardingDraft: null,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.accessToken || null,
      onboardingState: parsed?.onboardingState || 'NEVER_STARTED',
      onboardingDraft: parsed?.onboardingDraft || null,
    };
  } catch (_) {
    return {
      accessToken: null,
      onboardingState: 'NEVER_STARTED',
      onboardingDraft: null,
    };
  }
}

function persistAuthState(accessToken, onboardingState, onboardingDraft) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    accessToken: accessToken || null,
    onboardingState: onboardingState || 'NEVER_STARTED',
    onboardingDraft: onboardingDraft || null,
  };

  if (payload.accessToken) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    // Compatibility for legacy API helpers
    window.localStorage.setItem('authToken', payload.accessToken);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem('authToken');
  }
}

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

// --- ĐÃ THÊM LẠI HÀM NÀY ĐỂ FIX LỖI SYNTAX ---
export function decidePostLoginRoute(onboardingState) {
  return '/';
}

export function AuthProvider({ children }) {
  const initialAuthState = readStoredAuthState();
  const [accessToken, setAccessToken] = useState(initialAuthState.accessToken);
  const [onboardingState, setOnboardingState] = useState(initialAuthState.onboardingState);
  const [onboardingDraft, setOnboardingDraft] = useState(initialAuthState.onboardingDraft);

  const value = useMemo(
    () => ({
      accessToken,
      onboardingState,
      onboardingDraft,
      isAuthenticated: Boolean(accessToken),
      
      // Hàm cập nhật thông tin linh hoạt cho Account Settings
      updateAuthInfo: (updates) => {
        if (updates.accessToken !== undefined) setAccessToken(updates.accessToken);
        if (updates.onboardingState !== undefined) setOnboardingState(updates.onboardingState);
        if (updates.onboardingDraft !== undefined) setOnboardingDraft(updates.onboardingDraft);
        
        const current = readStoredAuthState();
        persistAuthState(
          updates.accessToken ?? current.accessToken,
          updates.onboardingState ?? current.onboardingState,
          updates.onboardingDraft ?? current.onboardingDraft
        );
      },

      applyLoginResult: (result) => {
        const nextToken = result?.accessToken || null;
        const nextState = result?.onboardingState || 'NEVER_STARTED';
        const nextDraft = result?.onboardingDraft ? sanitizeOnboardingDraft(result.onboardingDraft) : null;

        setAccessToken(nextToken);
        setOnboardingState(nextState);
        setOnboardingDraft(nextDraft);
        persistAuthState(nextToken, nextState, nextDraft);
      },

      logout: () => {
        setAccessToken(null);
        setOnboardingState('NEVER_STARTED');
        setOnboardingDraft(null);
        persistAuthState(null, 'NEVER_STARTED', null);
      },

      handleAccountDeleted: () => {
        setAccessToken(null);
        setOnboardingState('NEVER_STARTED');
        setOnboardingDraft(null);
        persistAuthState(null, 'NEVER_STARTED', null);
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
      },

      logoutAndRedirect: async () => {
        try {
          await authApi.logout();
        } catch (_) {
          // Luôn xóa state cục bộ kể cả khi logout server lỗi
        }

        setAccessToken(null);
        setOnboardingState('NEVER_STARTED');
        setOnboardingDraft(null);
        persistAuthState(null, 'NEVER_STARTED', null);
        if (typeof window !== 'undefined') {
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