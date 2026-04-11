import React from 'react';
import '../../style/general-component.css';
import { useAuth } from '../../providers/AuthProvider';

export default function MenuBar({ onClose }) {
  const { logoutAndRedirect } = useAuth();

  const navigateTo = (path) => {
    window.location.assign(path);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await logoutAndRedirect();
  };

  return (
    <div className="menubar">
      <button className="menubar__item" onClick={() => navigateTo('/settings')}>Settings</button>
      <button className="menubar__item" onClick={() => navigateTo('/learning-profile')}>Learning Profile</button>
      <button className="menubar__item" onClick={() => navigateTo('/skill-tree')}>Skill Tree</button>
      <div className="menubar__divider" />
      <button className="menubar__item menubar__item--danger" onClick={handleLogout}>Logout</button>
    </div>
  );
}
