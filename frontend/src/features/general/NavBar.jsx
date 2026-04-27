import React, { useRef, useState, useEffect } from 'react';
import { Moon, Search, Sun } from "lucide-react";
import MenuBar from './MenuBar';
import { useAuth } from '../../providers/AuthProvider';
import { useNotification } from './NotificationContainer';
import accountApi from '../../services/account.api';
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

export function getRoadmapSearchTarget(pathname) {
  const blockedPaths = ['/login', '/register', '/forgot-password'];
  return !blockedPaths.includes(pathname);
}

function dispatchRoadmapSearchQuery(query) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('roadmap-search-query', { detail: { query } }));
}

function dispatchOpenRoadmapSearchOverlay() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('roadmap-search-overlay-open'));
}

function navigateToPath(path) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(path);
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
  const [searchText, setSearchText] = useState('');
  const [theme, setTheme] = useState(resolveInitialTheme);
  const avatarRef = useRef(null);
  const { isAuthenticated, accessToken, onboardingState } = useAuth();
  const { addNotification } = useNotification();

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

  const goHome = () => {
    window.location.assign('/');
  };

  const goLogin = () => {
    window.location.assign('/login');
  };

  const goRegister = () => {
    window.location.assign('/register');
  };

  const goRoadmapSearch = () => {
    if (typeof window !== 'undefined') {
      const canOpen = getRoadmapSearchTarget(window.location.pathname);
      if (canOpen) {
        dispatchOpenRoadmapSearchOverlay();
      }
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const goMyRoadmaps = () => {
    const onboardingDone = onboardingState === 'COMPLETED';

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
      } catch (_) {
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialQuery = String(params.get('q') || '').trim();
    if (initialQuery) {
      setSearchText(initialQuery);
      dispatchRoadmapSearchQuery(initialQuery);
    }
  }, []);

  const navigationItems = isAuthenticated
    ? [
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
      {
        key: 'system-improvement',
        label: 'Cải tiến hệ thống',
        onClick: () => navigateToPath('/system-improvement'),
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
        onClick: () => navigateToHomeSection('how-it-works'),
      },
      {
        key: 'system-improvement',
        label: 'Cải tiến hệ thống',
        onClick: () => navigateToPath('/system-improvement'),
      },
    ];

  const isHomepage = typeof window !== 'undefined' ? window.location.pathname === '/' : true;

  return (
    <nav className="navbar">
      <button type="button" className="navbar__icon navbar__brand-btn" onClick={goHome}>
        <img src="/images/ueticon.jpg" alt="UET Icon" className="navbar__icon-img" width={36} height={36} style={{ marginRight: 8 }} />
        UETCompass
      </button>
      <div className="navbar__search" onClick={goRoadmapSearch}>
        <Search className="navbar__search-icon" size={16} />
        <input
          className="navbar__input"
          type="text"
          placeholder="Tìm kiếm roadmap..."
          value={searchText}
          onFocus={goRoadmapSearch}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearchText(nextValue);
            dispatchRoadmapSearchQuery(nextValue);
          }}
        />
      </div>
      {isHomepage ? (
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
      ) : null}
      <div className="navbar__actions">
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
    </nav>
  );
}
