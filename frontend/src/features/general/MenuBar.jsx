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
      <button className="menubar__item" onClick={() => navigateTo('/learning-profile')}>Trang cá nhân</button>
      <button className="menubar__item" onClick={() => navigateTo('/skill-tree')}>Lộ trình học tập</button>
      <button className="menubar__item" onClick={() => navigateTo('/manual-roadmap')}>Tạo roadmap thủ công</button>
      <button className="menubar__item" onClick={() => navigateTo('/settings')}>Cài đặt</button>
      <div className="menubar__divider" />
      <button className="menubar__item menubar__item--danger" onClick={handleLogout}>Đăng xuất</button>
    </div>
  );
}
