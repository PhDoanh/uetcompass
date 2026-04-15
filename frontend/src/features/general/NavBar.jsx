import React, { useRef, useState, useEffect } from 'react';
import { Moon, Search } from "lucide-react";
import MenuBar from './MenuBar';
import { useAuth } from '../../providers/AuthProvider';
import accountApi from '../../services/account.api';
import '../../style/general-component.css';

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

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFallback, setAvatarFallback] = useState('U');
  const [searchText, setSearchText] = useState('');
  const [displayName, setDisplayName] = useState('Người dùng');
  const avatarRef = useRef(null);
  const { isAuthenticated, accessToken } = useAuth();

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
      setDisplayName('Người dùng');
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
          setDisplayName(next.displayName);
        }
      } catch (_) {
        if (isMounted) {
          setAvatarUrl('');
          setAvatarFallback('U');
          setDisplayName('Người dùng');
        }
      }
    }

    function handleProfileUpdated(event) {
      const next = getAvatarState(event?.detail?.profile || {});
      setAvatarUrl(next.avatarUrl);
      setAvatarFallback(next.avatarFallback);
      setDisplayName(next.displayName);
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
      <div className="navbar__actions">
        <button type="button" className="navbar__icon-btn" aria-label="Dark mode">
          <Moon size={18} />
        </button>

        {isAuthenticated ? (
          <div className="navbar__avatar-wrapper" ref={avatarRef}>
            <button
              type="button"
              className="navbar__auth-btn navbar__profile-trigger"
              title="Tài khoản"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="navbar__profile-name">{displayName}</span>
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
