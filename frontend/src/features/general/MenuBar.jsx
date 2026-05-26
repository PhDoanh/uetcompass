import React from 'react';
import { Gauge, LogOut, Route, Settings, User } from 'lucide-react';
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
      <button className="menubar__item" onClick={() => navigateToPath('/learning-profile')}>
        <User className="menubar__item-icon" aria-hidden="true" />
        Trang cá nhân
      </button>
      <button className="menubar__item" onClick={() => navigateToPath('/progress')}>
        <Gauge className="menubar__item-icon" aria-hidden="true" />
        Tiến độ học tập
      </button>
      <button className="menubar__item" onClick={() => navigateToPath('/manual-roadmap')}>
        <Route className="menubar__item-icon" aria-hidden="true" />
        Lộ trình mới
      </button>
      <button className="menubar__item" onClick={() => navigateToPath('/settings')}>
        <Settings className="menubar__item-icon" aria-hidden="true" />
        Cài đặt
      </button>
      <div className="menubar__divider" />
      <button className="menubar__item menubar__item--danger" onClick={handleLogout}>
        <LogOut className="menubar__item-icon" aria-hidden="true" />
        Đăng xuất
      </button>
    </div>
  );
}
