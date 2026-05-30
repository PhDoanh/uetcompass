import React, { useRef, useState, useEffect } from 'react';
import { Bell, Check, Moon, Search, Sun } from "lucide-react";
import MenuBar from './MenuBar';
import { useAuth } from '../../providers/AuthProvider';
import { useNotification } from '../notification/NotificationContainer';
import accountApi from '../../services/account.api';
import { navigateTo } from '../../shared/navigation';
import { getRoadmapSearchTarget } from './navbar.utils';
import '../../style/general-component.css';

const THEME_STORAGE_KEY = 'uetcompass-theme';

function resolveInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = String(window.localStorage.getItem(THEME_STORAGE_KEY) || '').trim();
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getAvatarState(profile = {}) {
  const avatarUrl = String(profile?.avatarUrl || '').trim();
  const displayName = String(
    profile?.effectiveDisplayName || profile?.displayName || profile?.fullName || profile?.email || ''
  ).trim();

  return {
    avatarUrl,
    avatarFallback: (displayName.charAt(0) || 'U').toUpperCase(),
    displayName: displayName || 'Người dùng',
  };
}

function dispatchOpenRoadmapSearchOverlay() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('roadmap-search-overlay-open'));
}

function navigateToHomeSection(sectionId) {
  if (typeof window === 'undefined') {
    return;
  }

  const pathname = window.location.pathname;
  if (pathname !== '/') {
    window.location.assign(`/#${sectionId}`);
    return;
  }

  const target = document.getElementById(sectionId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `/#${sectionId}`);
  }
}

function scrollToMyRoadmapsSection() {
  if (typeof window === 'undefined') {
    return false;
  }

  const target = document.getElementById('my-roadmaps');
  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', '/#my-roadmaps');
  return true;
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFallback, setAvatarFallback] = useState('U');
  const [theme, setTheme] = useState(resolveInitialTheme);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isRoadmapSearchOpen, setIsRoadmapSearchOpen] = useState(false);
  const avatarRef = useRef(null);
  const notificationRef = useRef(null);
  const { isAuthenticated, accessToken, onboardingState, updateAuthInfo, logoutAndRedirect } = useAuth();
  const {
    addNotification,
    savedNotifications,
    removeSavedNotification,
    clearSavedNotifications,
  } = useNotification();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    function onScroll() {
      const nav = document.querySelector('.navbar');
      if (!nav) return;
      if (window.scrollY > 10) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOpen = () => setIsRoadmapSearchOpen(true);
    const handleClose = () => setIsRoadmapSearchOpen(false);

    window.addEventListener('roadmap-search-overlay-open', handleOpen);
    window.addEventListener('roadmap-search-overlay-close', handleClose);

    return () => {
      window.removeEventListener('roadmap-search-overlay-open', handleOpen);
      window.removeEventListener('roadmap-search-overlay-close', handleClose);
    };
  }, []);

  const goHome = () => {
    navigateTo('/');
  };

  const goLogin = () => {
    navigateTo('/login');
  };

  const goRegister = () => {
    navigateTo('/register');
  };

  const goRoadmapSearch = () => {
    if (typeof window !== 'undefined') {
      const canOpen = getRoadmapSearchTarget(window.location.pathname);
      if (canOpen) {
        dispatchOpenRoadmapSearchOverlay();
        setIsRoadmapSearchOpen(true);
      }
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const goMyRoadmaps = async () => {
    let onboardingDone = onboardingState === 'COMPLETED';
    if (!onboardingDone && accessToken) {
      try {
        const profile = await accountApi.getProfile(accessToken);
        const resolvedState = profile?.onboardingState;
        const hasMajorFallback = Boolean(String(profile?.profile?.major || '').trim());
        onboardingDone = resolvedState === 'COMPLETED' || (!resolvedState && hasMajorFallback);

        if (onboardingDone) {
          updateAuthInfo?.({ onboardingState: 'COMPLETED' });
        } else if (resolvedState && resolvedState !== onboardingState) {
          updateAuthInfo?.({ onboardingState: resolvedState });
        }
      } catch (error) {
        if (error?.status === 401) {
          logoutAndRedirect?.();
          return;
        }
      }
    }

    if (!onboardingDone) {
      addNotification('Bạn cần hoàn tất onboarding để mở Lộ trình của tôi.', 'warning');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (window.location.pathname !== '/') {
      window.location.assign('/#my-roadmaps');
      return;
    }

    const hasMyRoadmapsSection = scrollToMyRoadmapsSection();
    if (!hasMyRoadmapsSection) {
      addNotification('Bạn cần hoàn tất onboarding để mở Lộ trình của tôi.', 'warning');
    }
  };

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleNotificationClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    }

    if (notificationOpen) {
      document.addEventListener('mousedown', handleNotificationClickOutside);
    } else {
      document.removeEventListener('mousedown', handleNotificationClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleNotificationClickOutside);
    };
  }, [notificationOpen]);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated || !accessToken) {
      setAvatarUrl('');
      setAvatarFallback('U');
      return () => {
        isMounted = false;
      };
    }

    async function loadProfile() {
      try {
        const result = await accountApi.getProfile(accessToken);
        const next = getAvatarState(result?.identity || {});
        if (isMounted) {
          setAvatarUrl(next.avatarUrl);
          setAvatarFallback(next.avatarFallback);
        }
      } catch {
        if (isMounted) {
          setAvatarUrl('');
          setAvatarFallback('U');
        }
      }
    }

    function handleProfileUpdated(event) {
      const next = getAvatarState(event?.detail?.profile || {});
      setAvatarUrl(next.avatarUrl);
      setAvatarFallback(next.avatarFallback);
    }

    loadProfile();
    window.addEventListener('account-profile-updated', handleProfileUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('account-profile-updated', handleProfileUpdated);
    };
  }, [accessToken, isAuthenticated]);

  const navigationItems = isAuthenticated
    ? [
      {
        key: 'monthly-progress',
        label: 'Tiến độ học tập',
        onClick: () => navigateToHomeSection('monthly-progress'),
      },
      {
        key: 'my-roadmap',
        label: 'Lộ trình của tôi',
        onClick: goMyRoadmaps,
      },
      {
        key: 'community-roadmap',
        label: 'Lộ trình cộng đồng',
        onClick: () => navigateToHomeSection('roadmap-community'),
      },
    ]
    : [
      {
        key: 'features',
        label: 'Tính năng',
        onClick: () => navigateToHomeSection('featured-features'),
      },
      {
        key: 'roadmap',
        label: 'Lộ trình',
        onClick: () => navigateToHomeSection('roadmap-community'),
      },
      {
        key: 'how-it-works',
        label: 'Cách hoạt động',
        onClick: () => navigateToHomeSection('system-flow'),
      },
    ];

  const hasSavedNotifications = savedNotifications.length > 0;

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <button type="button" className="navbar__icon navbar__brand-btn" onClick={goHome}>
          <img src="/images/ueticon.png" alt="UET Icon" className="navbar__icon-img" width={36} height={36} style={{ marginRight: 8 }} />
          UETCompass
        </button>
        <div className="navbar__links" aria-label="Điều hướng chính">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="navbar__link"
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="navbar__right">
        <div className="navbar__search" role="search">
          <Search size={16} aria-hidden="true" className="navbar__search-icon" />
          <input
            className="navbar__input"
            type="search"
            placeholder="Tìm lộ trình"
            readOnly
            aria-label="Tìm kiếm lộ trình"
            aria-haspopup="dialog"
            aria-controls="roadmap-search-overlay"
            aria-expanded={isRoadmapSearchOpen}
            onClick={goRoadmapSearch}
            onFocus={goRoadmapSearch}
          />
        </div>
        <div className="navbar__actions">
          <div className="navbar__notification" ref={notificationRef}>
            <button
              type="button"
              className="navbar__icon-btn navbar__notification-btn"
              aria-label="Thông báo"
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((open) => !open)}
            >
              <Bell size={18} />
              {hasSavedNotifications ? <span className="navbar__notification-dot" /> : null}
            </button>
            {notificationOpen ? (
              <div className="navbar__notification-panel" role="dialog" aria-label="Thông báo">
                <div className="navbar__notification-header">
                  <span>Thông báo</span>
                  <button
                    type="button"
                    className="navbar__notification-clear"
                    onClick={clearSavedNotifications}
                    disabled={!hasSavedNotifications}
                  >
                    Đã đọc tất cả
                  </button>
                </div>
                {hasSavedNotifications ? (
                  <div className="navbar__notification-list">
                    {savedNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`navbar__notification-item navbar__notification-item--${notif.type}`}
                      >
                        <span className="navbar__notification-message">{notif.message}</span>
                        <button
                          type="button"
                          className="navbar__notification-read"
                          onClick={() => removeSavedNotification(notif.id)}
                          aria-label="Đánh dấu đã đọc"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="navbar__notification-empty">Chưa có thông báo.</div>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="navbar__icon-btn"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <div className="navbar__avatar-wrapper" ref={avatarRef}>
              <button
                type="button"
                className="navbar__auth-btn navbar__profile-trigger"
                title="Tài khoản"
                aria-label="Mở menu tài khoản"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <div className="navbar__avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar người dùng" className="navbar__avatar-img" />
                  ) : (
                    <span>{avatarFallback}</span>
                  )}
                </div>
              </button>
              {menuOpen && <MenuBar onClose={() => setMenuOpen(false)} />}
            </div>
          ) : (
            <div className="navbar__auth-actions">
              <button type="button" className="navbar__auth-btn" onClick={goRegister}>Đăng ký</button>
              <button type="button" className="navbar__auth-btn navbar__auth-btn--primary" onClick={goLogin}>Đăng nhập</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
