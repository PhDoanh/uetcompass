
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import '../../style/general-component.css';

const HOMEPAGE_ONBOARDING_SEEN_PREFIX = 'homepageOnboardingSeen';
const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';

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
  const [popupMessage, setPopupMessage] = useState('');

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextMessage = window.sessionStorage.getItem(ONBOARDING_REDIRECT_NOTICE_KEY);
    if (!nextMessage) {
      return;
    }

    setPopupMessage(nextMessage);
    window.sessionStorage.removeItem(ONBOARDING_REDIRECT_NOTICE_KEY);
  }, []);

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

      {popupMessage ? (
        <div className="homepage-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="homepage-popup-title">
          <div className="homepage-popup">
            <h2 id="homepage-popup-title" className="homepage-popup__title">Thông báo</h2>
            <p className="homepage-popup__message">{popupMessage}</p>
            <div className="homepage-popup__actions">
              <button
                type="button"
                className="homepage-popup__button"
                onClick={() => setPopupMessage('')}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
