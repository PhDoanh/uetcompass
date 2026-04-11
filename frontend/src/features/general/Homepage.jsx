
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import accountApi from '../../services/account.api';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import '../../style/general-component.css';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';

function resolveDisplayName(accessToken) {
  if (!accessToken || typeof window === 'undefined') {
    return null;
  }

  try {
    const payloadPart = accessToken.split('.')[1] || '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded);

    const displayName = String(payload?.displayName || payload?.fullName || payload?.name || '').trim();
    if (displayName) {
      return displayName;
    }

    const email = String(payload?.email || '').trim().toLowerCase();
    if (email.includes('@')) {
      return email.split('@')[0];
    }
  } catch (_) {
    return null;
  }

  return null;
}

export default function Homepage() {
  const { accessToken, onboardingState, logoutAndRedirect } = useAuth();
  const [showOnboardingPanel, setShowOnboardingPanel] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const displayName = useMemo(() => resolveDisplayName(accessToken), [accessToken]);

  const shouldPromptOnboarding = useMemo(
    () => onboardingState !== 'COMPLETED' && Boolean(accessToken),
    [accessToken, onboardingState]
  );

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

  useEffect(() => {
    let isMounted = true;

    async function loadDisplayName() {
      if (!accessToken) {
        if (isMounted) {
          setProfileDisplayName('');
        }
        return;
      }

      try {
        const result = await accountApi.getProfile(accessToken);
        const identity = result?.identity || {};
        const nextName = String(
          identity?.effectiveDisplayName || identity?.displayName || identity?.fullName || ''
        ).trim();

        if (isMounted) {
          setProfileDisplayName(nextName);
        }
      } catch (err) {
        if (err?.status === 401) {
          await logoutAndRedirect();
          return;
        }

        if (isMounted) {
          setProfileDisplayName('');
        }
      }
    }

    loadDisplayName();

    return () => {
      isMounted = false;
    };
  }, [accessToken, logoutAndRedirect]);

  const handleCloseOnboarding = () => {
    setShowOnboardingPanel(false);
  };

  const handleOpenOnboarding = () => {
    setShowOnboardingPanel(true);
  };

  return (
    <div className="homepage">
      <main className="homepage-content">
        <section className="homepage-section homepage-section--hero">
          <p className="homepage-status">{accessToken ? `Chào ${profileDisplayName || displayName || 'bạn'}` : 'Bạn đang là khách'}</p>
          <h1 className="homepage-title">UET-ers Roadmaps</h1>
          <p className="homepage-description">
            UETCompass là nơi tổng hợp lộ trình học tập và định hướng nghề nghiệp cho sinh viên,
            giúp bạn bắt đầu nhanh và đi đúng hướng.
          </p>

          <div className="homepage-role-row" aria-label="Roadmap roles">
            <span className="homepage-dotline" aria-hidden="true">...</span>
            <button type="button" className="homepage-role-pill">Fullstack Engineer</button>
            <button type="button" className="homepage-role-pill">DevOps</button>
            <button type="button" className="homepage-role-pill">Game Developer</button>
            <button type="button" className="homepage-role-pill">Project Manager</button>
            <button type="button" className="homepage-role-pill">Software Architect</button>
            <span className="homepage-dotline" aria-hidden="true">...</span>
          </div>

          <div className="homepage-hero-actions">
            <a href="/sample-roadmap" className="homepage-wire-btn">Build your own roadmap</a>
            {shouldPromptOnboarding ? (
              <>
                <p className="homepage-onboarding-hint">Thực hiện onboarding để tạo roadmap cá nhân hóa.</p>
                <button type="button" onClick={handleOpenOnboarding} className="homepage-wire-btn homepage-wire-btn--solid">
                  Go to onboarding
                </button>
              </>
            ) : null}
          </div>
        </section>

        <section className="homepage-section homepage-section--blank" aria-hidden="true" />

        <section className="homepage-section homepage-section--follow">
          <h2>Follow us</h2>
        </section>

        <section className="homepage-section homepage-section--footer">
          <h2>Footer</h2>
        </section>
      </main>

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
