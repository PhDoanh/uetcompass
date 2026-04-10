import React, { useRef, useState, useEffect } from 'react';
import { Menu, Search } from "lucide-react";
import MenuBar from './MenuBar';
import '../../style/general-component.css';

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  const goHome = () => {
    window.location.assign('/');
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

  return (
    <nav className="navbar">
      <button type="button" className="navbar__icon navbar__brand-btn" onClick={goHome}>
        <img src="/images/ueticon.jpg" alt="UET Icon" className="navbar__icon-img" width={36} height={36} style={{ marginRight: 8 }} />
        UET Compass
      </button>
      <div className="navbar__search">
        <Search className="navbar__search-icon" size={16} />
        <input className="navbar__input" type="text" placeholder="Search..." />
      </div>
      <div className="navbar__avatar-wrapper" ref={avatarRef}>
        <div
          className="navbar__avatar"
          title="Profile"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span>U</span>
        </div>
        {menuOpen && <MenuBar onClose={() => setMenuOpen(false)} />}
      </div>
    </nav>
  );
}
