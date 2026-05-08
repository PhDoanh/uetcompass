import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import '../../style/general-component.css';

export default function Notification({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div className={`notification notification--${type}`}>
      <div className="notification__icon">
        {icons[type]}
      </div>
      <div className="notification__message">
        {message}
      </div>
      <button className="notification__close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
