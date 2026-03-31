
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import '../../style/general-component.css';

const HOMEPAGE_ONBOARDING_SEEN_PREFIX = 'homepageOnboardingSeen';

function resolveAccountKey(accessToken) {
  if (!accessToken) {
    return null;
  }

  try {
    const payloadPart = accessToken.split('.')[1] || '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded);
    const userId = String(payload?.userId || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    return userId || email || null;
  } catch (_) {
    return null;
  }
}

export default function Homepage() {
  const { accessToken, onboardingState, logoutAndRedirect } = useAuth();
  const [showOnboardingPanel, setShowOnboardingPanel] = useState(false);

  const shouldPromptOnboarding = useMemo(
    () => onboardingState !== 'COMPLETED' && Boolean(accessToken),
    [accessToken, onboardingState]
  );

  const onboardingSeenKey = useMemo(() => {
    const accountKey = resolveAccountKey(accessToken);
    if (!accountKey) {
      return null;
    }
    return `${HOMEPAGE_ONBOARDING_SEEN_PREFIX}:${accountKey}`;
  }, [accessToken]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasSeenPrompt = onboardingSeenKey
      ? window.localStorage.getItem(onboardingSeenKey) === '1'
      : false;
    setShowOnboardingPanel(shouldPromptOnboarding && !hasSeenPrompt);
  }, [onboardingSeenKey, shouldPromptOnboarding]);

  const handleCloseOnboarding = () => {
    setShowOnboardingPanel(false);
    if (typeof window !== 'undefined' && onboardingSeenKey) {
      window.localStorage.setItem(onboardingSeenKey, '1');
    }
  };

  return (
    <div className="homepage">
      <div style={{ padding: '24px' }}>
        <h1>Welcome to UET Compass</h1>
        <p>Your personalized learning and skill development platform.</p>
      </div>

      {showOnboardingPanel && (
        <div className="homepage-onboarding-overlay">
          <OnboardingPanel
            authToken={accessToken}
            onUnauthorized={logoutAndRedirect}
            onCompleted={handleCloseOnboarding}
            onClose={handleCloseOnboarding}
          />
        </div>
      )}
    </div>
  );
}
