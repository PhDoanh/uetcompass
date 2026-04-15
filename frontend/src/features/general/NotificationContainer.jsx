import React, { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
import Notification from './Notification';
import { openRoadmapNotificationStream } from '../../services/notification.api';
import { acceptPrimaryRoadmap } from '../../services/roadmap.api';
import { useSkillTreeStore } from '../../stores/skillTreeStore';
import '../../style/general-component.css';

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children, sseToken }) {
  const [notifications, setNotifications] = useState([]);
  const eventSourceRef = useRef(null);
  const acceptingPreviewRef = useRef(false);
  const requestRefetch = useSkillTreeStore((s) => s.requestRefetch);

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Listen for roadmap SSE notifications
  useEffect(() => {
    if (!sseToken) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = openRoadmapNotificationStream(sseToken);
    eventSourceRef.current = es;
    es.addEventListener('roadmap:notification', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type && payload.message) {
          addNotification(payload.message, payload.type);
        }
        if (payload.status === 'completed') {
          requestRefetch();
        }
      } catch {}
    });
    es.addEventListener('roadmap_preview_ready', async (event) => {
      if (acceptingPreviewRef.current) {
        return;
      }

      try {
        const payload = JSON.parse(event.data || '{}');
        const studentProfileId = String(payload?.studentProfileId || '').trim();
        const roadmapName = String(payload?.roadmapName || '').trim();
        const personalisationLevel = payload?.personalisationLevel === 'low' ? 'low' : 'full';
        const nodes = Array.isArray(payload?.preview?.nodes) ? payload.preview.nodes : [];

        if (!sseToken || !studentProfileId || !roadmapName || nodes.length === 0) {
          return;
        }

        acceptingPreviewRef.current = true;
        await acceptPrimaryRoadmap(sseToken, {
          studentProfileId,
          roadmapName,
          personalisationLevel,
          isPrimary: true,
          nodes,
        });

        addNotification('Roadmap generated and accepted successfully.', 'success');
        requestRefetch();
      } catch (error) {
        addNotification(error?.message || 'Failed to accept generated roadmap preview.', 'error');
      } finally {
        acceptingPreviewRef.current = false;
      }
    });
    es.addEventListener('error', () => {
      addNotification('Lost connection to roadmap updates.', 'error');
    });
    return () => {
      es.close();
    };
  }, [sseToken, requestRefetch, addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 9999 }}>
        {notifications.map((notif, index) => (
          <div key={notif.id} style={{ marginBottom: index > 0 ? '12px' : '0' }}>
            <Notification
              message={notif.message}
              type={notif.type}
              duration={notif.duration}
              onClose={() => removeNotification(notif.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
