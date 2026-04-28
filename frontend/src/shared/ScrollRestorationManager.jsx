import { useEffect, useRef } from 'react';
import { NAVIGATION_START_EVENT } from './navigation';

// eslint-disable-next-line react/prop-types
export default function ScrollRestorationManager({ routeKey }) {
  const scrollByRouteRef = useRef(new Map());
  const shouldRestoreRef = useRef(false);

  const makeStorageKey = (route) => `uet:scroll:${route}`;

  const storeScrollPosition = (route, value) => {
    const safeRoute = String(route || '').trim();
    if (!safeRoute || typeof window === 'undefined') {
      return;
    }

    const safeValue = Math.max(0, Number(value || 0));
    scrollByRouteRef.current.set(safeRoute, safeValue);

    try {
      window.sessionStorage.setItem(makeStorageKey(safeRoute), String(safeValue));
    } catch (_) {
      // Ignore storage errors.
    }
  };

  const readScrollPosition = (route) => {
    const safeRoute = String(route || '').trim();
    if (!safeRoute || typeof window === 'undefined') {
      return 0;
    }

    if (scrollByRouteRef.current.has(safeRoute)) {
      return Number(scrollByRouteRef.current.get(safeRoute) || 0);
    }

    try {
      const raw = window.sessionStorage.getItem(makeStorageKey(safeRoute));
      const parsed = Number(raw || 0);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    } catch (_) {
      return 0;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    window.history.scrollRestoration = 'manual';
    storeScrollPosition(routeKey, window.scrollY || 0);

    const handlePopState = () => {
      shouldRestoreRef.current = true;
    };

    const handleNavigationStart = (event) => {
      const fromRoute = String(event?.detail?.from || '').trim();
      if (!fromRoute) {
        return;
      }

      storeScrollPosition(fromRoute, window.scrollY || 0);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
      window.history.scrollRestoration = 'auto';
    };
  }, [routeKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const saveCurrentScroll = () => {
      storeScrollPosition(routeKey, window.scrollY || 0);
    };

    window.addEventListener('scroll', saveCurrentScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', saveCurrentScroll);
    };
  }, [routeKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextY = shouldRestoreRef.current ? readScrollPosition(routeKey) : 0;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: nextY, left: 0, behavior: 'auto' });
    });

    if (shouldRestoreRef.current) {
      storeScrollPosition(routeKey, nextY);
    }
    shouldRestoreRef.current = false;
  }, [routeKey]);

  return null;
}
