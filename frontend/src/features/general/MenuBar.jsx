import React from 'react';
import '../../style/general-component.css';
import { useAuth } from '../../providers/AuthProvider';
import { navigateTo } from '../../shared/navigation';

export default function MenuBar({ onClose }) {
  const { logoutAndRedirect } = useAuth();

  const navigateToPath = (path) => {
    navigateTo(path);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await logoutAndRedirect();
  };

  return (
    <div className="menubar">
      <button className="menubar__item" onClick={() => navigateToPath('/learning-profile')}>Trang cá nhân</button>
      <button className="menubar__item" onClick={() => navigateToPath('/progress')}>Tiến độ học tập</button>
      <button className="menubar__item" onClick={() => navigateToPath('/manual-roadmap')}>Lộ trình mới</button>
      <button className="menubar__item" onClick={() => navigateToPath('/settings')}>Cài đặt</button>
      <div className="menubar__divider" />
      <button className="menubar__item menubar__item--danger" onClick={handleLogout}>Đăng xuất</button>
    </div>
  );
}
