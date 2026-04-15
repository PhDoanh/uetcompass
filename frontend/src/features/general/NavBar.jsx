import React, { useRef, useState, useEffect } from 'react';
import { Search } from "lucide-react";
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
    displayName: displayName || 'User',
  };
}

export function getRoadmapSearchTarget(pathname) {
  return pathname === '/roadmaps/search' ? null : '/roadmaps/search';
}

function dispatchRoadmapSearchQuery(query) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('roadmap-search-query', { detail: { query } }));
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFallback, setAvatarFallback] = useState('U');
  const [displayName, setDisplayName] = useState('User');
  const [searchText, setSearchText] = useState('');
  const avatarRef = useRef(null);
  const { isAuthenticated, accessToken } = useAuth();

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
      const nextPath = getRoadmapSearchTarget(window.location.pathname);
      if (nextPath) {
        window.location.assign(nextPath);
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
      setDisplayName('User');
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
          setDisplayName('User');
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
        UET Compass
      </button>
      <div className="navbar__search" onClick={goRoadmapSearch}>
        <Search className="navbar__search-icon" size={16} />
        <input
          className="navbar__input"
          type="text"
          placeholder="Search roadmap by name..."
          value={searchText}
          onFocus={goRoadmapSearch}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearchText(nextValue);
            dispatchRoadmapSearchQuery(nextValue);
          }}
        />
      </div>
      {isAuthenticated ? (
        <div className="navbar__avatar-wrapper" ref={avatarRef}>
          <button
            type="button"
            className="navbar__auth-btn navbar__profile-trigger"
            title="Profile"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="navbar__profile-name">{displayName}</span>
            <div className="navbar__avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User avatar" className="navbar__avatar-img" />
              ) : (
                <span>{avatarFallback}</span>
              )}
            </div>
          </button>
          {menuOpen && <MenuBar onClose={() => setMenuOpen(false)} />}
        </div>
      ) : (
        <div className="navbar__auth-actions">
          <button type="button" className="navbar__auth-btn" onClick={goLogin}>Login</button>
          <button type="button" className="navbar__auth-btn navbar__auth-btn--primary" onClick={goRegister}>Register</button>
        </div>
      )}
    </nav>
  );
}
