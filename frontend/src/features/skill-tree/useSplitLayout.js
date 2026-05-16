import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_RATIO = 0.35;
const MIN_RATIO = 0.22;
const MAX_RATIO = 0.60;
const RESIZER_WIDTH = 14;
const COMPACT_QUERY = '(max-width: 1100px)';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * CSS-variable-driven split layout.
 *
 * Instead of measuring the DOM width and applying pixel inline styles (which
 * causes a flash on first render while JS hasn't measured yet), we drive the
 * panel size with a single CSS custom property: --st-panel-ratio.
 *
 * The CSS rule for .skill-tree-layout__panel uses:
 *   flex: 0 0 calc(var(--st-panel-ratio, 0.35) * 100%)
 *
 * Since the initial ratio is known at render time (0.35), the layout is
 * correct from the very first frame — no flicker, no "panel overlapping
 * canvas" on load.
 *
 * Drag/keyboard interactions only update the CSS variable; no DOM measurements
 * are needed for the initial render.
 */
export function useSplitLayout({
  defaultRatio = DEFAULT_RATIO,
  minRatio = MIN_RATIO,
  maxRatio = MAX_RATIO,
  resizerWidth = RESIZER_WIDTH,
  compactQuery = COMPACT_QUERY,
} = {}) {
  const layoutRef = useRef(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Keep a ref of the current ratio so drag handlers always read the latest
  // value without needing to be re-created on every ratio change.
  const ratioRef = useRef(defaultRatio);
  const dragRef = useRef({ startX: 0, startRatio: defaultRatio });

  // Sync ratioRef whenever state changes
  useEffect(() => {
    ratioRef.current = ratio;
  }, [ratio]);

  // Watch compact breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mq = window.matchMedia(compactQuery);
    const onChange = () => setIsCompactLayout(mq.matches);
    setIsCompactLayout(mq.matches);

    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }

    // Older Safari
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [compactQuery]);

  // Pointer-drag resize
  useEffect(() => {
    if (!isResizing || typeof window === 'undefined') return undefined;

    const savedCursor = document.body.style.cursor;
    const savedSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const totalWidth = layoutRef.current?.getBoundingClientRect().width || 0;
      if (!totalWidth) return;

      const available = Math.max(1, totalWidth - resizerWidth);
      // Drag right → canvas wider → panel ratio smaller
      const delta = (e.clientX - dragRef.current.startX) / available;
      const next = clamp(dragRef.current.startRatio - delta, minRatio, maxRatio);
      setRatio(next);
    };

    const onEnd = () => setIsResizing(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);

    return () => {
      document.body.style.cursor = savedCursor;
      document.body.style.userSelect = savedSelect;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [isResizing, minRatio, maxRatio, resizerWidth]);

  const handleResizePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startRatio: ratioRef.current };
    setIsResizing(true);
  }, []);

  const handleResizeKeyDown = useCallback((e) => {
    const KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!KEYS.includes(e.key)) return;
    e.preventDefault();

    if (e.key === 'Home') { setRatio(minRatio); return; }
    if (e.key === 'End') { setRatio(maxRatio); return; }

    const totalWidth = layoutRef.current?.getBoundingClientRect().width || 800;
    const available = Math.max(1, totalWidth - resizerWidth);
    const step = (e.shiftKey ? 48 : 24) / available;
    // ArrowLeft → panel bigger (ratio up), ArrowRight → canvas bigger (ratio down)
    setRatio((cur) => clamp(cur + (e.key === 'ArrowLeft' ? step : -step), minRatio, maxRatio));
  }, [minRatio, maxRatio, resizerWidth]);

  return {
    layoutRef,
    ratio,
    isCompactLayout,
    minRatio,
    maxRatio,
    handleResizePointerDown,
    handleResizeKeyDown,
  };
}
