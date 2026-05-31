
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../providers/AuthProvider';
import { getSummaries, getTrackingTables } from '../../services/progress.api';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import { useNotification } from '../notification/NotificationContainer';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import ReviewCarousel from './ReviewCarousel';
import CompassFeatureMap from './CompassFeatureMap';
import SiteFooter from './SiteFooter';
import { navigateTo } from '../../shared/navigation';
import '../../style/general-component.css';
import { loadManualProgress } from '../progress/manualProgress.utils';
import {
  Briefcase,
  Cloud,
  Code2,
  Cpu,
  Database,
  FlaskConical,
  GraduationCap,
  Laptop,
  MonitorSmartphone,
  ShieldCheck,
  Server,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';
const ONBOARDING_AUTO_OPEN_ONCE_KEY = 'onboardingAutoOpenOnce';
const ROADMAPS_PER_PAGE = 10;
const MY_ROADMAPS_PER_PAGE = 5;
const MY_MANUAL_ROADMAPS_PREVIEW_LIMIT = 5;

function buildPublicSkillTreeHref(roadmapId) {
  const normalizedRoadmapId = encodeURIComponent(String(roadmapId || '').trim());
  return normalizedRoadmapId ? `/skill-tree/${normalizedRoadmapId}` : '/skill-tree';
}

function isManualRoadmapShared(roadmap) {
  return Boolean(roadmap?.shared || roadmap?.isPublic || roadmap?.sharedAt || roadmap?.status === 'published');
}

function getRoadmapKey(item) {
  const roadmapId = String(item?.roadmapId || '').trim();
  if (!roadmapId) {
    return '';
  }

  const roadmapSource = String(item?.roadmapSource || (item?.isManual ? 'manual' : item?.isPrimary ? 'primary' : 'roadmap') || '').trim() || 'roadmap';
  return item?.roadmapKey || `${roadmapSource}:${roadmapId}`;
}

const HERO_LEFT_ICONS = [
  { key: 'left-1', top: '12%', left: '8%', size: '62px', rotate: '-8deg', icon: GraduationCap },
  { key: 'left-2', top: '24%', left: '18%', size: '46px', rotate: '6deg', icon: FlaskConical },
  { key: 'left-3', top: '38%', left: '10%', size: '40px', rotate: '-12deg', icon: Code2 },
  { key: 'left-4', top: '52%', left: '16%', size: '48px', rotate: '10deg', icon: Database },
  { key: 'left-5', top: '68%', left: '6%', size: '40px', rotate: '-6deg', icon: Cpu },
  { key: 'left-6', top: '82%', left: '20%', size: '46px', rotate: '12deg', icon: MonitorSmartphone },
];
const HERO_RIGHT_ICONS = [
  { key: 'right-1', top: '14%', right: '10%', size: '46px', rotate: '10deg', icon: Briefcase },
  { key: 'right-2', top: '28%', right: '6%', size: '54px', rotate: '-8deg', icon: Server },
  { key: 'right-3', top: '42%', right: '16%', size: '42px', rotate: '12deg', icon: Cloud },
  { key: 'right-4', top: '58%', right: '8%', size: '40px', rotate: '-6deg', icon: ShieldCheck },
  { key: 'right-5', top: '72%', right: '14%', size: '48px', rotate: '8deg', icon: Laptop },
  { key: 'right-6', top: '84%', right: '6%', size: '40px', rotate: '-10deg', icon: Users },
];


function scrollToHomeHashTarget() {
  if (typeof window === 'undefined' || window.location.pathname !== '/') {
    return;
  }

  const hash = String(window.location.hash || '').replace(/^#/, '').trim();
  if (!hash) {
    return;
  }

  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function resolveDisplayName(accessToken) {
  if (!accessToken || typeof window === 'undefined') {
    return null;
  }

  try {
    const payloadPart = accessToken.split('.')[1] || '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded);

    const displayName = String(payload?.displayName || payload?.fullName || payload?.name || '').trim();
    if (displayName) {
      return displayName;
    }

    const email = String(payload?.email || '').trim().toLowerCase();
    if (email.includes('@')) {
      return email.split('@')[0];
    }
  } catch {
    return null;
  }

  return null;
}

function resolveUserId(accessToken) {
  if (!accessToken || typeof window === 'undefined') {
    return null;
  }

  try {
    const payloadPart = accessToken.split('.')[1] || '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded);
    const userId = String(payload?.userId || payload?.sub || '').trim();
    return userId || null;
  } catch {
    return null;
  }
}

function isInvalidSessionError(err) {
  return err?.status === 401 || (err?.status === 403 && err?.code === 'FORBIDDEN');
}

function isSameMonth(date, compare) {
  return date.getFullYear() === compare.getFullYear() && date.getMonth() === compare.getMonth();
}

function findCurrentMonthBucket(buckets = [], referenceDate = new Date()) {
  return buckets.find((bucket) => {
    if (!bucket?.periodStart) {
      return false;
    }
    const date = new Date(`${bucket.periodStart}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return isSameMonth(date, referenceDate);
  }) || null;
}

function buildActivitySeriesFromBuckets(buckets = []) {
  return buckets.map((bucket) => ({
    day: bucket.periodStart || 'N/A',
    value: bucket.activeNodes || 0,
  }));
}

function toRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

  function buildMonthlyHeatmapCells(dailyBuckets = []) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const startDay = monthStart.getDay();
    const leadingBlanks = (startDay + 6) % 7;

    const bucketMap = new Map(
      dailyBuckets.map((bucket) => [String(bucket?.periodStart || ''), bucket])
    );

    let maxActive = 0;
    const dailyValues = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const key = date.toISOString().slice(0, 10);
      const active = bucketMap.get(key)?.activeNodes || 0;
      maxActive = Math.max(maxActive, active);
      dailyValues.push({ dayNumber: day, active });
    }

    const cells = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ dayNumber: null, level: 0, isEmpty: true });
    }

    dailyValues.forEach((value) => {
      const level = maxActive === 0
        ? 0
        : value.active
          ? Math.min(4, Math.max(1, Math.ceil((value.active / maxActive) * 4)))
          : 0;
      cells.push({ dayNumber: value.dayNumber, level, isEmpty: false });
    });

    const remainder = cells.length % 7;
    const trailingBlanks = remainder === 0 ? 0 : 7 - remainder;
    for (let i = 0; i < trailingBlanks; i += 1) {
      cells.push({ dayNumber: null, level: 0, isEmpty: true });
    }

    return cells;
  }

  function computeActivityStreak(activitySeries) {
    let streak = 0;
    for (let index = activitySeries.length - 1; index >= 0; index -= 1) {
      if (activitySeries[index].value > 0) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }

  function dedupeRoadmapsByKey(items = []) {
    const seen = new Set();
    const uniqueItems = [];

    items.forEach((item) => {
      const roadmapKey = getRoadmapKey(item);
      if (!roadmapKey || seen.has(roadmapKey)) {
        return;
      }

      seen.add(roadmapKey);
      uniqueItems.push(item);
    });

    return uniqueItems;
  }

  function dedupeRoadmapsByRoadmapId(items = []) {
    const byId = new Map();

    for (const item of Array.isArray(items) ? items : []) {
      const roadmapId = String(item?.roadmapId || item?._id || '').trim();
      if (!roadmapId) {
        continue;
      }

      const existing = byId.get(roadmapId);
      if (!existing) {
        byId.set(roadmapId, item);
        continue;
      }

      const nextIsPrimary = Boolean(item?.isPrimary);
      const existingIsPrimary = Boolean(existing?.isPrimary);
      if (nextIsPrimary && !existingIsPrimary) {
        byId.set(roadmapId, item);
        continue;
      }

      if (nextIsPrimary === existingIsPrimary) {
        const nextUpdatedAt = new Date(item?.updatedAt || item?.lastActivityDate || 0).getTime();
        const existingUpdatedAt = new Date(existing?.updatedAt || existing?.lastActivityDate || 0).getTime();
        if (nextUpdatedAt > existingUpdatedAt) {
          byId.set(roadmapId, item);
        }
      }
    }

    return Array.from(byId.values());
  }
export default function Homepage() {
  const { accessToken, onboardingState, logoutAndRedirect, updateAuthInfo } = useAuth();
  const { addNotification } = useNotification();
  const [showOnboardingPanel, setShowOnboardingPanel] = useState(false);
  const [publicRoadmaps, setPublicRoadmaps] = useState([]);
  const [myManualRoadmaps, setMyManualRoadmaps] = useState([]);
  const [openingRoadmapTitle, setOpeningRoadmapTitle] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(scrollToHomeHashTarget);
    window.addEventListener('hashchange', scrollToHomeHashTarget);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('hashchange', scrollToHomeHashTarget);
    };
  }, []);
  const [deletingManualRoadmapId, setDeletingManualRoadmapId] = useState('');
  const [pendingDeleteRoadmap, setPendingDeleteRoadmap] = useState(null);
  const [progressSummaries, setProgressSummaries] = useState([]);
  const [progressTracking, setProgressTracking] = useState(null);
  const [progressTrackingDaily, setProgressTrackingDaily] = useState(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState(null);
  const [progressTrackingGroupBy, setProgressTrackingGroupBy] = useState('weekly');
  const [manualProgressSummaries, setManualProgressSummaries] = useState([]);
  const [monthlyRoadmapStats, setMonthlyRoadmapStats] = useState([]);
  const [monthlyRoadmapLoading, setMonthlyRoadmapLoading] = useState(false);
  const [roadmapPage, setRoadmapPage] = useState(0);
  const [myRoadmapPage, setMyRoadmapPage] = useState(0);
  const [sharingManualRoadmapId, setSharingManualRoadmapId] = useState('');
  const [copyingManualRoadmapId, setCopyingManualRoadmapId] = useState('');
  const displayName = useMemo(() => resolveDisplayName(accessToken), [accessToken]);
  const userId = useMemo(() => resolveUserId(accessToken), [accessToken]);
  const currentMonthLabel = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return `tháng ${month}`;
  }, []);

  const shouldPromptOnboarding = useMemo(
    () => onboardingState !== 'COMPLETED' && Boolean(accessToken),
    [accessToken, onboardingState]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextMessage = window.sessionStorage.getItem(ONBOARDING_REDIRECT_NOTICE_KEY);
    if (!nextMessage) {
      return;
    }

    addNotification(nextMessage, 'warning');
    window.sessionStorage.removeItem(ONBOARDING_REDIRECT_NOTICE_KEY);
  }, [addNotification]);

  useEffect(() => {
    if (typeof window === 'undefined' || !accessToken || onboardingState === 'COMPLETED') {
      return;
    }

    const shouldAutoOpen = window.sessionStorage.getItem(ONBOARDING_AUTO_OPEN_ONCE_KEY) === '1';
    if (!shouldAutoOpen) {
      return;
    }

    setShowOnboardingPanel(true);
    window.sessionStorage.removeItem(ONBOARDING_AUTO_OPEN_ONCE_KEY);
  }, [accessToken, onboardingState]);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicRoadmaps() {
      try {
        const result = await manualRoadmapApi.listPublicManualRoadmaps({ limit: 6 });
        if (isMounted) {
          setPublicRoadmaps(result.items || []);
        }
      } catch {
        // Silently fail for public roadmaps
        if (isMounted) {
          setPublicRoadmaps([]);
        }
      }
    }

    async function loadMyManualRoadmaps() {
      if (!accessToken) {
        if (isMounted) {
          setMyManualRoadmaps([]);
        }
        return;
      }

      try {
        const result = await manualRoadmapApi.listManualRoadmaps(accessToken, {
          page: 1,
          limit: MY_MANUAL_ROADMAPS_PREVIEW_LIMIT,
        });
        const items = dedupeRoadmapsByRoadmapId(Array.isArray(result?.items) ? result.items : []);
        if (isMounted) {
          setMyManualRoadmaps(items);
        }
      } catch (err) {
        if (isInvalidSessionError(err)) {
          await logoutAndRedirect();
          return;
        }

        try {
          const fallback = await manualRoadmapApi.listPublicManualRoadmaps({ page: 1, limit: 100 });
          const fallbackItems = Array.isArray(fallback?.items) ? fallback.items : [];
          const ownRoadmaps = dedupeRoadmapsByRoadmapId(fallbackItems
            .filter((roadmap) => String(roadmap?.userId || '').trim() === String(userId || '').trim())
            .slice(0, MY_MANUAL_ROADMAPS_PREVIEW_LIMIT));
          if (isMounted) {
            setMyManualRoadmaps(ownRoadmaps);
          }
        } catch {
          if (isMounted) {
            setMyManualRoadmaps([]);
          }
        }
      }
    }

    loadPublicRoadmaps();
    loadMyManualRoadmaps();

    return () => {
      isMounted = false;
    };
  }, [accessToken, logoutAndRedirect, userId]);

  useEffect(() => {
    function handleGenerationCompleted() {
      if (accessToken) {
        manualRoadmapApi.listManualRoadmaps(accessToken, {
          page: 1,
          limit: MY_MANUAL_ROADMAPS_PREVIEW_LIMIT,
        }).then((result) => {
          const items = dedupeRoadmapsByRoadmapId(Array.isArray(result?.items) ? result.items : []);
          setMyManualRoadmaps(items);
        }).catch(() => {});
      }
    }
    window.addEventListener('roadmap:generation:completed', handleGenerationCompleted);
    return () => window.removeEventListener('roadmap:generation:completed', handleGenerationCompleted);
  }, [accessToken]);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      if (!accessToken) {
        if (isMounted) {
          setProgressSummaries([]);
          setProgressTracking(null);
          setProgressTrackingDaily(null);
          setProgressError(null);
          setIsLoadingProgress(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingProgress(true);
        setProgressError(null);
      }

      try {
        const summaries = await getSummaries(accessToken);
        if (!isMounted) {
          return;
        }

        setProgressSummaries(summaries);
        const tracking = await getTrackingTables(accessToken, {
          scope: 'all',
          groupBy: progressTrackingGroupBy,
        });
        const dailyTracking = await getTrackingTables(accessToken, {
          scope: 'all',
          groupBy: 'daily',
        });
        if (isMounted) {
          setProgressTracking(tracking);
          setProgressTrackingDaily(dailyTracking);
        }
      } catch (err) {
        if (isInvalidSessionError(err)) {
          await logoutAndRedirect();
          return;
        }

        if (isMounted) {
          setProgressError(err);
          setProgressTracking(null);
          setProgressTrackingDaily(null);
          setProgressSummaries([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProgress(false);
        }
      }
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [accessToken, logoutAndRedirect, progressTrackingGroupBy]);

  useEffect(() => {
    let isMounted = true;

    if (!accessToken) {
      if (isMounted) {
        setManualProgressSummaries([]);
      }
      return () => {
        isMounted = false;
      };
    }

    loadManualProgress(accessToken)
      .then(({ summaries }) => {
        if (isMounted) {
          setManualProgressSummaries(summaries);
        }
      })
      .catch(async (err) => {
        if (isInvalidSessionError(err)) {
          await logoutAndRedirect();
          return;
        }
        if (isMounted) {
          setManualProgressSummaries([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, logoutAndRedirect]);

  const primaryProgressRoadmap = useMemo(() => {
    const list = dedupeRoadmapsByRoadmapId(Array.isArray(progressSummaries) ? progressSummaries : []);
    return list.find((item) => item?.isPrimary) || list[0] || null;
  }, [progressSummaries]);

  const progressRoadmapCards = useMemo(() => {
    const manualProgressById = new Map(
      dedupeRoadmapsByRoadmapId(Array.isArray(manualProgressSummaries) ? manualProgressSummaries : [])
        .map((summary) => [String(summary?.roadmapId || '').trim(), summary])
        .filter(([roadmapId]) => Boolean(roadmapId))
    );

    const cards = [];

    if (primaryProgressRoadmap) {
      cards.push({
        kind: 'personalized',
        id: primaryProgressRoadmap.roadmapId,
        roadmap: primaryProgressRoadmap,
      });
    }

    for (const roadmap of dedupeRoadmapsByRoadmapId(Array.isArray(myManualRoadmaps) ? myManualRoadmaps : [])) {
      const roadmapId = String(roadmap?._id || '').trim();
      if (!roadmapId) {
        continue;
      }

      cards.push({
        kind: 'manual',
        id: roadmapId,
        roadmap: manualProgressById.get(roadmapId) || roadmap,
      });
    }

    return dedupeRoadmapsByRoadmapId(cards.map((card) => card.roadmap));
  }, [manualProgressSummaries, myManualRoadmaps, primaryProgressRoadmap]);

  useEffect(() => {
    let isMounted = true;

    if (!accessToken || progressRoadmapCards.length === 0) {
      if (isMounted) {
        setMonthlyRoadmapStats([]);
        setMonthlyRoadmapLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    const colorList = ['#0EA5E9', '#F97316', '#6366F1', '#EC4899', '#22C55E', '#F59E0B', '#14B8A6'];
    setMonthlyRoadmapLoading(true);

    Promise.allSettled(
      progressRoadmapCards.map(async (roadmap, index) => {
        const roadmapId = roadmap?.roadmapId;
        if (!roadmapId) {
          return null;
        }

        try {
          const response = await getTrackingTables(accessToken, {
            scope: 'roadmap',
            roadmapId,
            groupBy: 'monthly',
          });
          const bucket = findCurrentMonthBucket(response?.buckets || []);
          const completedNodes = bucket?.completedNodes || 0;
          const totalNodes = roadmap?.totalNodes || 0;
          const doneNodes = roadmap?.doneNodes || 0;
          const completionPercent = totalNodes > 0
            ? Math.round((doneNodes / totalNodes) * 100)
            : Math.round(roadmap?.progressPercent || 0);

          return {
            roadmapId,
            roadmapKey: getRoadmapKey(roadmap) || `${roadmap?.isManual ? 'manual' : roadmap?.isPrimary ? 'primary' : 'roadmap'}:${roadmapId}`,
            roadmapName: roadmap?.roadmapName || 'Roadmap',
            completedNodes,
            completionPercent,
            color: colorList[index % colorList.length],
          };
        } catch {
          const totalNodes = roadmap?.totalNodes || 0;
          const doneNodes = roadmap?.doneNodes || 0;
          const completionPercent = totalNodes > 0
            ? Math.round((doneNodes / totalNodes) * 100)
            : Math.round(roadmap?.progressPercent || 0);

          return {
            roadmapId,
            roadmapKey: getRoadmapKey(roadmap) || `${roadmap?.isManual ? 'manual' : roadmap?.isPrimary ? 'primary' : 'roadmap'}:${roadmapId}`,
            roadmapName: roadmap?.roadmapName || 'Roadmap',
            completedNodes: 0,
            completionPercent,
            color: colorList[index % colorList.length],
          };
        }
      })
    ).then((results) => {
      if (!isMounted) {
        return;
      }
      const items = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((item) => item && item.roadmapId);
      setMonthlyRoadmapStats(items);
      setMonthlyRoadmapLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [accessToken, progressRoadmapCards]);

  const handleCloseOnboarding = (result) => {
    setShowOnboardingPanel(false);

    if (result) {
      updateAuthInfo?.({ onboardingState: 'COMPLETED', onboardingDraft: null });
    }
  };

  const handleOpenOnboarding = () => {
    setShowOnboardingPanel(true);
  };

  const handleOpenRoadmapCard = async (cardTitle) => {
    const normalizedTitle = String(cardTitle || '').trim();
    if (!normalizedTitle || typeof window === 'undefined') {
      return;
    }

    setOpeningRoadmapTitle(normalizedTitle);

    try {
      const localMatch = publicRoadmaps.find(
        (roadmap) => String(roadmap?.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
      );

      let matchedRoadmap = localMatch || null;

      if (!matchedRoadmap) {
        const searchResult = await manualRoadmapApi.listPublicManualRoadmaps({ q: normalizedTitle, page: 1, limit: 20 });
        const items = Array.isArray(searchResult?.items) ? searchResult.items : [];

        matchedRoadmap = items.find(
          (roadmap) => String(roadmap?.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
        ) || items[0] || null;
      }

      const roadmapId = String(matchedRoadmap?._id || '').trim();
      if (!roadmapId) {
        throw new Error('Không tìm thấy roadmap công khai phù hợp.');
      }

      navigateTo(`/skill-tree/${encodeURIComponent(roadmapId)}`);
    } catch (_) {
      addNotification('Không thể mở roadmap lúc này. Vui lòng thử lại sau.', 'error');
    } finally {
      setOpeningRoadmapTitle('');
    }
  };

  const handleRequestDeleteManualRoadmap = (roadmapId, roadmapTitle) => {
    const normalizedId = String(roadmapId || '').trim();
    if (!normalizedId) {
      return;
    }

    setPendingDeleteRoadmap({ id: normalizedId, title: roadmapTitle || 'này' });
  };

  const handleShareManualRoadmap = useCallback(async (roadmapId) => {
    const normalizedRoadmapId = String(roadmapId || '').trim();
    if (!normalizedRoadmapId || !accessToken || typeof window === 'undefined') {
      return;
    }

    setSharingManualRoadmapId(normalizedRoadmapId);

    try {
      const updatedRoadmap = await manualRoadmapApi.shareManualRoadmap(accessToken, normalizedRoadmapId);
      setMyManualRoadmaps((current) => current.map((roadmap) => (
        String(roadmap?._id || '').trim() === normalizedRoadmapId
          ? {
              ...roadmap,
              ...updatedRoadmap,
              shared: true,
              isPublic: true,
              status: 'published',
              sharedAt: updatedRoadmap?.sharedAt || roadmap?.sharedAt || new Date().toISOString(),
            }
          : roadmap
      )));
      addNotification('Đã bật chia sẻ cho manual roadmap.', 'success');
    } catch (err) {
      if (err?.status === 401) {
        await logoutAndRedirect();
        return;
      }

      addNotification(err?.message || 'Không thể bật chia sẻ cho roadmap này.', 'error');
    } finally {
      setSharingManualRoadmapId('');
    }
  }, [accessToken, addNotification, logoutAndRedirect]);

  const handleToggleShareManualRoadmap = useCallback(async (roadmapId, currentlyShared) => {
    const normalizedRoadmapId = String(roadmapId || '').trim();
    if (!normalizedRoadmapId || !accessToken || typeof window === 'undefined') {
      return;
    }

    setSharingManualRoadmapId(normalizedRoadmapId);

    try {
      if (currentlyShared) {
        const updatedRoadmap = await manualRoadmapApi.unshareManualRoadmap(accessToken, normalizedRoadmapId);
        setMyManualRoadmaps((current) => current.map((roadmap) => (
          String(roadmap?._id || '').trim() === normalizedRoadmapId
            ? {
                ...roadmap,
                ...updatedRoadmap,
                shared: false,
                isPublic: false,
                status: 'draft',
                sharedAt: null,
              }
            : roadmap
        )));
        addNotification('Đã tắt chia sẻ cho manual roadmap.', 'success');
      } else {
        const updatedRoadmap = await manualRoadmapApi.shareManualRoadmap(accessToken, normalizedRoadmapId);
        setMyManualRoadmaps((current) => current.map((roadmap) => (
          String(roadmap?._id || '').trim() === normalizedRoadmapId
            ? {
                ...roadmap,
                ...updatedRoadmap,
                shared: true,
                isPublic: true,
                status: 'published',
                sharedAt: updatedRoadmap?.sharedAt || roadmap?.sharedAt || new Date().toISOString(),
              }
            : roadmap
        )));
        addNotification('Đã bật chia sẻ cho manual roadmap.', 'success');
      }
    } catch (err) {
      if (err?.status === 401) {
        await logoutAndRedirect();
        return;
      }

      addNotification(err?.message || 'Không thể thay đổi trạng thái chia sẻ cho roadmap này.', 'error');
    } finally {
      setSharingManualRoadmapId('');
    }
  }, [accessToken, addNotification, logoutAndRedirect]);

  const handleCopyManualRoadmapLink = useCallback(async (roadmapId) => {
    const normalizedRoadmapId = String(roadmapId || '').trim();
    if (!normalizedRoadmapId || typeof window === 'undefined') {
      return;
    }

    const shareUrl = `${window.location.origin}${buildPublicSkillTreeHref(normalizedRoadmapId)}`;
    setCopyingManualRoadmapId(normalizedRoadmapId);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      addNotification('Đã sao chép link public skill tree.', 'success');
    } catch (err) {
      addNotification(err?.message || 'Không thể sao chép link lúc này.', 'error');
    } finally {
      setCopyingManualRoadmapId('');
    }
  }, [addNotification]);

  const handleDeleteManualRoadmap = async () => {
    if (!pendingDeleteRoadmap || !accessToken || typeof window === 'undefined') {
      setPendingDeleteRoadmap(null);
      return;
    }

    const { id: normalizedId } = pendingDeleteRoadmap;
    if (!normalizedId) {
      setPendingDeleteRoadmap(null);
      return;
    }

    setDeletingManualRoadmapId(normalizedId);

    try {
      await manualRoadmapApi.deleteManualRoadmap(accessToken, normalizedId);
      setMyManualRoadmaps((prev) => prev.filter((roadmap) => String(roadmap?._id || '').trim() !== normalizedId));
      setManualProgressSummaries((prev) => prev.filter((summary) => summary?.roadmapId !== normalizedId));
      addNotification('Đã xóa roadmap thành công.', 'success');
    } catch (err) {
      if (isInvalidSessionError(err)) {
        await logoutAndRedirect();
        return;
      }
      addNotification(err?.message || 'Xóa roadmap thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setDeletingManualRoadmapId('');
      setPendingDeleteRoadmap(null);
    }
  };

  const handleCancelDeleteManualRoadmap = () => {
    if (deletingManualRoadmapId) {
      return;
    }
    setPendingDeleteRoadmap(null);
  };

  const socialAvatars = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAm3OZLEw_e4IktWDFZy2iAf8Cw1jTHvNOWvTQHGiNA3g6ZsV_radMO5HphkK6j_SVRQviUpbVRZpvTMyJliwOY2u7BrUoe_wJYBxLT5DB0AfyaUIasLCU2U2o3QiEGu6AfX947BwgkHovy7yugGuVY8qr-XDaJ-FbiEh2WzepR-0yCbMW0zJ0ptnst2hC86wDY6_4XC0VXSuMSSJXTQrob_LI76RHptUioHV6uOAQe5FNsrtUQEJLC8hbeprscLaunOelKDECmoAs',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBE4ZG-Jjw72WlNfuIVexhs5C8Mm_da1cflBQY_DCKqsS2xnQ44MRodSBQPPVmckSQcSYDnZbVa2Z01yUvJ9bjko2eHXnHh2AIfiOoCouhalixD_NhlElp1fS39nmFm46N_Bc7jsrLIY7WeSr9OX3rdispw5DdhGpbRQKl0VKl5y-AyCreS3YVZe8-5zrB4ZxE-aQfWVNQS-R6O5Q8TCHDZHBZfUgHe0P0N-8SQQCOr7migcmOcGnfhpO5OlaxeKKcCNCDUKQGyZ_4',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUpvRyYC72x7gmoVa_gY8AltiVFaZ9TODyN9xlUefH-N86clFq2n0Ai-wCEvT1DpLWFZHub2pnUPVwz4ZkMUZp0cVYw1lntZpDldno4f02TdOw-SWmCn92gjdw5A6k_8mBsc3CYR5JASxpDx5OJij4s3rPop9-mgBITulxmTQKLuOxpMOzH7zQ5oyIftvPniVMSpc6YhLSTQ6BNn9CV_mnTK6jlHUDQXDtsEDxplybSY6ZCE-yvPMYt3MVahfbrQ5p8gIwrBVr0gg',
  ];

  const communityRoadmapCards = publicRoadmaps.map((item) => ({
    roadmapId: String(item._id || '').trim(),
    title: String(item.title || '').trim(),
    description: String(item.description || '').trim(),
    rating: typeof item.averageRating === 'number' ? item.averageRating : null,
    tags: (item.tags || []).map((t) => (typeof t === 'string' ? t : (t.label || t.normalizedLabel || ''))).filter(Boolean),
    image: item.thumbnailUrl || item.image || '/images/cards/uetstone.jpg',
    nodeCount: typeof item.nodeCount === 'number' ? item.nodeCount : null,
    sharedBy: {
      userId: String(item.ownerUserId || '').trim(),
      name: item.ownerName || null,
      avatar: item.ownerAvatar || null,
    },
  }));
  const totalRoadmapPages = Math.max(1, Math.ceil(communityRoadmapCards.length / ROADMAPS_PER_PAGE));
  const canGoPrevRoadmapPage = roadmapPage > 0;
  const canGoNextRoadmapPage = roadmapPage < totalRoadmapPages - 1;
  const visibleRoadmapCards = communityRoadmapCards.slice(
    roadmapPage * ROADMAPS_PER_PAGE,
    (roadmapPage + 1) * ROADMAPS_PER_PAGE
  );
  const isSingleRoadmapCardPage = visibleRoadmapCards.length === 1;
  const hasPersonalizedRoadmap = onboardingState === 'COMPLETED' && Boolean(accessToken);
  const myManualRoadmapCards = dedupeRoadmapsByRoadmapId(Array.isArray(myManualRoadmaps) ? myManualRoadmaps : [])
    .filter((roadmap) => String(roadmap?._id || '').trim());
  const myRoadmapCards = [
    ...(hasPersonalizedRoadmap ? [{ kind: 'personalized', id: 'personalized' }] : []),
    ...myManualRoadmapCards.map((roadmap) => ({ kind: 'manual', id: String(roadmap?._id || '').trim(), roadmap })),
  ];
  const totalMyRoadmapPages = Math.max(1, Math.ceil(myRoadmapCards.length / MY_ROADMAPS_PER_PAGE));
  const canGoPrevMyRoadmapPage = myRoadmapPage > 0;
  const canGoNextMyRoadmapPage = myRoadmapPage < totalMyRoadmapPages - 1;
  const visibleMyRoadmapCards = myRoadmapCards.slice(
    myRoadmapPage * MY_ROADMAPS_PER_PAGE,
    (myRoadmapPage + 1) * MY_ROADMAPS_PER_PAGE
  );
  const shouldShowMyRoadmapsSection = Boolean(accessToken) && (hasPersonalizedRoadmap || myManualRoadmapCards.length > 0);
  const monthlyTotalNodes = useMemo(
    () => monthlyRoadmapStats.reduce((sum, item) => sum + (item.completedNodes || 0), 0),
    [monthlyRoadmapStats]
  );
  const monthlyDistribution = useMemo(
    () => monthlyRoadmapStats.map((item) => ({
      name: item.roadmapName,
      value: item.completedNodes,
      color: item.color,
      completionPercent: item.completionPercent,
    })),
    [monthlyRoadmapStats]
  );
  const roadmapProgressStack = useMemo(
    () => progressRoadmapCards.map((roadmap, index) => {
      const stats = monthlyRoadmapStats.find((item) => getRoadmapKey(item) === getRoadmapKey(roadmap));
      const totalNodes = roadmap?.totalNodes || (roadmap?.doneNodes || 0) + (roadmap?.pendingNodes || 0);
      const doneNodes = roadmap?.doneNodes || 0;
      const completionPercent = totalNodes > 0
        ? Math.round((doneNodes / totalNodes) * 100)
        : Math.round(roadmap?.progressPercent || 0);
      const color = stats?.color || ['#0EA5E9', '#F97316', '#6366F1', '#EC4899', '#22C55E', '#F59E0B', '#14B8A6'][index % 7];

      return {
        roadmapId: roadmap.roadmapId,
        name: roadmap?.roadmapName || 'Roadmap',
        totalNodes,
        doneNodes,
        monthlyCompleted: stats?.completedNodes || 0,
        completionPercent,
        color,
      };
    }),
    [progressRoadmapCards, monthlyRoadmapStats]
  );
  const totalStackNodes = useMemo(
    () => roadmapProgressStack.reduce((sum, item) => sum + (item.totalNodes || 0), 0),
    [roadmapProgressStack]
  );
  const totalStackDoneNodes = useMemo(
    () => roadmapProgressStack.reduce((sum, item) => sum + (item.doneNodes || 0), 0),
    [roadmapProgressStack]
  );
  const totalStackCompletionPercent = useMemo(() => {
    if (totalStackNodes === 0) {
      return 0;
    }
    return Math.round((totalStackDoneNodes / totalStackNodes) * 100);
  }, [totalStackDoneNodes, totalStackNodes]);
  const activitySeries = useMemo(() => {
    const baseSeries = buildActivitySeriesFromBuckets(progressTracking?.buckets || []);
    return baseSeries.slice(-7);
  }, [progressTracking]);
  const dailyActivitySeries = useMemo(() => {
    const baseSeries = buildActivitySeriesFromBuckets(progressTrackingDaily?.buckets || []);
    return baseSeries.slice(-30);
  }, [progressTrackingDaily]);
  const heatmapCells = useMemo(
    () => buildMonthlyHeatmapCells(progressTrackingDaily?.buckets || []),
    [progressTrackingDaily]
  );
  const activityStreak = useMemo(
    () => computeActivityStreak(dailyActivitySeries),
    [dailyActivitySeries]
  );
  const activityTotal = useMemo(
    () => activitySeries.reduce((sum, item) => sum + item.value, 0),
    [activitySeries]
  );
  const activityMeta = useMemo(() => {
    if (progressError) {
      return 'Không thể tải dữ liệu tiến độ.';
    }
    if (isLoadingProgress) {
      return 'Đang tải dữ liệu tiến độ...';
    }
    if (!progressTracking) {
      return 'Chưa có dữ liệu hoạt động gần đây.';
    }
    const roadmapLabel = primaryProgressRoadmap?.roadmapName
      ? ` - ${primaryProgressRoadmap.roadmapName}`
      : '';
    return `${activityTotal} node đã học gần đây${roadmapLabel}`;
  }, [activityTotal, isLoadingProgress, primaryProgressRoadmap, progressTracking, progressError]);
  const distributionMeta = useMemo(() => {
    if (progressError) {
      return 'Không thể tải dữ liệu tiến độ.';
    }
    if (isLoadingProgress || monthlyRoadmapLoading) {
      return 'Đang tải dữ liệu tiến độ...';
    }
    if (monthlyTotalNodes === 0) {
      return 'Chưa có node học trong tháng.';
    }
    return `${monthlyTotalNodes} node học trong ${currentMonthLabel}`;
  }, [currentMonthLabel, isLoadingProgress, monthlyRoadmapLoading, monthlyTotalNodes, progressError]);
  const streakMeta = useMemo(() => (
    activityStreak > 0
      ? `Chuỗi hoạt động ${activityStreak} ngày liên tiếp`
      : 'Chưa có streak hoạt động'
  ), [activityStreak]);

  const handlePrevRoadmapPage = () => {
    setRoadmapPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextRoadmapPage = () => {
    setRoadmapPage((prev) => Math.min(totalRoadmapPages - 1, prev + 1));
  };

  const handlePrevMyRoadmapPage = () => {
    setMyRoadmapPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextMyRoadmapPage = () => {
    setMyRoadmapPage((prev) => Math.min(totalMyRoadmapPages - 1, prev + 1));
  };

  useEffect(() => {
    setMyRoadmapPage((prev) => Math.min(prev, totalMyRoadmapPages - 1));
  }, [totalMyRoadmapPages]);

  return (
    <div className="homepage homepage--modern">
      <main className="homepage-content homepage-content--modern">
        {!accessToken || onboardingState !== 'COMPLETED' ? (
          <section id="hero" className="homepage-hero-modern homepage-hero-modern--centered">
            <div className="homepage-hero-orbits" aria-hidden="true">
              {HERO_LEFT_ICONS.map((icon) => (
                <span
                  key={icon.key}
                  className="homepage-hero-ico homepage-hero-ico--left"
                  style={{
                    '--ico-top': icon.top,
                    '--ico-left': icon.left,
                    '--ico-size': icon.size,
                    '--ico-rotate': icon.rotate,
                  }}
                >
                  <icon.icon className="homepage-hero-ico__icon" aria-hidden="true" />
                </span>
              ))}
              {HERO_RIGHT_ICONS.map((icon) => (
                <span
                  key={icon.key}
                  className="homepage-hero-ico homepage-hero-ico--right"
                  style={{
                    '--ico-top': icon.top,
                    '--ico-right': icon.right,
                    '--ico-size': icon.size,
                    '--ico-rotate': icon.rotate,
                  }}
                >
                  <icon.icon className="homepage-hero-ico__icon" aria-hidden="true" />
                </span>
              ))}
            </div>

            <div className="homepage-hero-modern__content homepage-hero-modern__content--centered">
              <span className="homepage-status homepage-status--badge">
                {accessToken ? `Chào ${displayName || 'bạn'}` : 'Sản phẩm đứng TOP #3 của tháng'}
              </span>
              <h1 className="homepage-title">
                La bàn dẫn lối sự nghiệp <span className="homepage-title__nowrap">UET-ers</span>
              </h1>
              <p className="homepage-description">
                Khám phá các cây kỹ năng và lộ trình đào tạo được thiết kế riêng cho sinh viên Đại học Công nghệ,
                từ lập trình web đến trí tuệ nhân tạo.
              </p>

              <div className="homepage-hero-actions homepage-hero-actions--inline">
                <a
                  href="/#roadmap-community"
                  className="homepage-wire-btn homepage-wire-btn--white"
                  onClick={(event) => {
                    event.preventDefault();
                    navigateTo('/#roadmap-community');
                  }}
                >
                  Khám phá lộ trình
                </a>
                {shouldPromptOnboarding ? (
                  <button type="button" onClick={handleOpenOnboarding} className="homepage-wire-btn homepage-wire-btn--translucent">
                    Nhận roadmap cá nhân hóa
                  </button>
                ) : accessToken ? (
                    <a
                      href="/skill-tree"
                      className="homepage-wire-btn homepage-wire-btn--translucent"
                      onClick={(event) => {
                        event.preventDefault();
                        navigateTo('/skill-tree');
                      }}
                    >
                    Nhận roadmap cá nhân hóa
                  </a>
                ) : (
                      <a
                        href="/register"
                        className="homepage-wire-btn homepage-wire-btn--translucent"
                        onClick={(event) => {
                          event.preventDefault();
                          navigateTo('/register');
                        }}
                      >
                    Nhận roadmap cá nhân hóa
                  </a>
                )}
              </div>

              <div className="homepage-social-proof" aria-label="Community stats">
                <div className="homepage-social-proof__avatars">
                  {socialAvatars.map((avatar) => (
                    <img key={avatar} src={avatar} alt="Sinh viên UET" />
                  ))}
                  <span>+1.2k</span>
                </div>
                <p><strong>1,200+</strong> sinh viên đang sử dụng</p>
              </div>
            </div>
          </section>
        ) : null}
          
        {accessToken && onboardingState === 'COMPLETED' ? (
          <section
            id="monthly-progress"
            className="homepage-section homepage-progress"
            aria-label="Tổng quan tiến độ"
          >
            <div className="homepage-section__head">
              <div>
                <h2>Tổng quan tiến độ {currentMonthLabel}</h2>
                <p>Theo dõi nhịp học tập và so sánh node đã học theo từng lộ trình.</p>
              </div>
              <button
                type="button"
                className="homepage-outline-btn"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigateTo('/progress');
                  }
                }}
              >
                Xem chi tiết
              </button>
            </div>
            <div className="homepage-progress__grid">
              <div className="homepage-progress__card">
                <div className="homepage-progress__title">Số node đã học</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setProgressTrackingGroupBy(option.id)}
                      className="homepage-outline-btn"
                      style={option.id === progressTrackingGroupBy ? {
                        backgroundColor: '#0EA5E9',
                        borderColor: '#0EA5E9',
                        color: '#fff',
                      } : undefined}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="homepage-progress__chart">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={activitySeries} margin={{ left: -12, right: 8, top: 10, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                      <YAxis domain={[0, 'dataMax']} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
                        labelFormatter={(label) => `Kỳ: ${label}`}
                        formatter={(value) => [`${value}`, 'Node đã học']}
                      />
                      <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="homepage-progress__meta">{activityMeta}</div>
              </div>
              <div className="homepage-progress__card">
                <div className="homepage-progress__title">Node học trong tháng</div>
                <div className="homepage-progress__chart homepage-progress__chart--donut">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={monthlyDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {monthlyDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="homepage-progress__legend">
                    {monthlyDistribution.map((entry) => (
                      <div key={entry.name} className="homepage-progress__legend-item">
                        <span className="homepage-progress__legend-dot" style={{ background: entry.color }} />
                        <span>{entry.name}</span>
                        <strong>{entry.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="homepage-progress__stack">
                  <div className="homepage-progress__stack-label">
                    Hoàn thành {totalStackCompletionPercent}%
                  </div>
                    {totalStackNodes > 0 ? (
                    <div className="homepage-progress__stack-track" role="list">
                      {roadmapProgressStack.map((entry) => (
                        <div
                          key={entry.roadmapId || entry.name}
                          className="homepage-progress__stack-segment"
                          style={{
                            flex: entry.totalNodes || 1,
                            backgroundColor: toRgba(entry.color, 0.18),
                          }}
                          role="listitem"
                          aria-label={`${entry.name}: ${entry.completionPercent}%`}
                        >
                          <span
                            className="homepage-progress__stack-fill"
                            style={{
                              width: `${entry.completionPercent}%`,
                              backgroundColor: entry.color,
                            }}
                          />
                          <span className="homepage-progress__stack-tooltip">
                            {entry.name}: {entry.completionPercent}% ({entry.monthlyCompleted} node)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="homepage-progress__stack-empty">Chưa có dữ liệu trong tháng này.</div>
                  )}
                </div>
                <div className="homepage-progress__meta">{distributionMeta}</div>
              </div>
              <div className="homepage-progress__card">
                <div className="homepage-progress__title">Hoạt động trong tháng</div>
                <div className="homepage-progress__heatmap">
                  <div className="homepage-progress__heatmap-header" aria-hidden="true">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => (
                      <span key={label} className="homepage-progress__heatmap-day">{label}</span>
                    ))}
                  </div>
                  <div className="homepage-progress__heatmap-grid">
                    {heatmapCells.map((cell, index) => (
                      <span
                        key={`${cell.dayNumber || 'empty'}-${index}`}
                        className={`homepage-progress__cell homepage-progress__cell--${cell.level}${cell.isEmpty ? ' is-empty' : ''}`}
                        aria-label={cell.dayNumber ? `Ngày ${cell.dayNumber} ${currentMonthLabel}` : 'Ngày trống'}
                      >
                        {cell.dayNumber ? (
                          <span className="homepage-progress__cell-label">{cell.dayNumber}</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="homepage-progress__meta">{streakMeta}</div>
              </div>
            </div>
          </section>
        ) : null}

        {!accessToken ? (
          <section
            id="featured-features"
            className="homepage-section homepage-featured"
            aria-label="Tính năng nổi bật"
          >
            <div className="homepage-featured__head">
              <h2>Tính năng nổi bật</h2>
            </div>
            <p className="homepage-featured__quote homepage-featured__quote--top-right">
              Tất cả công cụ bạn cần để định hướng và phát triển sự nghiệp ngay từ ghế nhà trường.
            </p>
            <div className="homepage-featured__radial">
              <CompassFeatureMap />
            </div>
            <p className="homepage-featured__quote homepage-featured__quote--bottom-left">
              Thiết kế mô phỏng giúp bạn hình dung hệ sinh thái học tập trên UETCompass.
            </p>
          </section>
        ) : null}

        {shouldShowMyRoadmapsSection ? (
          <section
            id="my-roadmaps"
            className="homepage-section homepage-section--plain"
            aria-label="My roadmap gallery"
          >
            <div className="homepage-roadmap-head">
              <div>
                <h2>Roadmap của tôi</h2>
                <p>Không gian roadmap dành riêng cho tài khoản của bạn.</p>
              </div>
              <div className="homepage-roadmap-controls">
                <button
                  type="button"
                  aria-label="Trước"
                  onClick={handlePrevMyRoadmapPage}
                  disabled={!canGoPrevMyRoadmapPage}
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  aria-label="Sau"
                  onClick={handleNextMyRoadmapPage}
                  disabled={!canGoNextMyRoadmapPage}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>

            <div className="homepage-roadmap-grid">
              {visibleMyRoadmapCards.map((card) => {
                if (card.kind === 'personalized') {
                  return (
                    <article key={card.id} className="homepage-roadmap-card homepage-roadmap-card--featured">
                      <div className="homepage-roadmap-card__image-wrap">
                        <img src="/images/uetstone.jpg" alt="Roadmap cá nhân hóa" className="homepage-roadmap-card__image" />
                        <div className="homepage-roadmap-card__chips">
                          <span className="homepage-chip homepage-chip--neutral">Sẵn sàng</span>
                          <span className="homepage-chip homepage-chip--indigo">Skill Tree</span>
                        </div>
                      </div>
                      <div className="homepage-roadmap-card__body">
                        <h3 className="homepage-roadmap-card__title">
                          Roadmap cá nhân hóa
                          <span className="homepage-feature-pill">Nổi bật</span>
                        </h3>
                        <p className="homepage-roadmap-card__description">
                          Đã hoàn tất onboarding, bạn có thể học theo skill tree cá nhân hóa.
                        </p>
                        <div className="homepage-roadmap-card__meta">
                          <small>Sẵn sàng học tập</small>
                          <button
                            type="button"
                            className="homepage-card-action"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigateTo('/skill-tree');
                              }
                            }}
                          >
                            Mở skill tree
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                const roadmap = card.roadmap;
                const roadmapId = card.id;
                const roadmapTitle = String(roadmap?.title || '').trim() || 'Roadmap tạo thủ công';
                const isShared = isManualRoadmapShared(roadmap);
                const isSharing = sharingManualRoadmapId === roadmapId;
                const isCopying = copyingManualRoadmapId === roadmapId;
                const isDeleting = deletingManualRoadmapId === roadmapId;

                return (
                  <article key={roadmapId} className="homepage-roadmap-card">
                    <div className="homepage-roadmap-card__image-wrap">
                      <img
                        src="https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80"
                        alt={roadmapTitle}
                        className="homepage-roadmap-card__image"
                      />
                      <div className="homepage-roadmap-card__chips">
                        <span className="homepage-chip homepage-chip--neutral">Đã có</span>
                        <span className="homepage-chip homepage-chip--blue">Manual</span>
                      </div>
                    </div>
                    <div className="homepage-roadmap-card__body">
                      <h3 className="homepage-roadmap-card__title">{roadmapTitle}</h3>
                      <div className="homepage-roadmap-card__share">
                        <div className="homepage-roadmap-card__share-row">
                          <div className="homepage-roadmap-card__share-meta">
                            <span className="homepage-roadmap-card__share-label">Chia sẻ</span>
                            <span className="homepage-roadmap-card__share-state">
                              {isShared ? 'Đang mở công khai' : 'Chỉ mình bạn xem'}
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isShared}
                            aria-label={`Chia sẻ roadmap ${roadmapTitle}`}
                            className={`homepage-roadmap-share-toggle${isShared ? ' is-on' : ''}`}
                            onClick={() => handleToggleShareManualRoadmap(roadmapId, isShared)}
                            aria-busy={isSharing}
                          >
                            <span className="homepage-roadmap-share-toggle__thumb" />
                          </button>
                        </div>

                        {isShared ? (
                          <button
                            type="button"
                            className="homepage-roadmap-share-copy"
                            onClick={() => handleCopyManualRoadmapLink(roadmapId)}
                            disabled={isCopying}
                          >
                            <Copy size={14} aria-hidden="true" />
                            <span>{isCopying ? 'Đang sao chép...' : 'Sao chép link'}</span>
                          </button>
                        ) : null}
                      </div>
                      <div className="homepage-roadmap-card__meta homepage-roadmap-card__meta--actions-only">
                        <div className="homepage-roadmap-card__meta-actions">
                          <button
                            type="button"
                            className="homepage-card-action"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigateTo(`/skill-tree/${encodeURIComponent(roadmapId)}?mine=1`);
                              }
                            }}
                            disabled={isDeleting}
                          >
                            Mở roadmap
                          </button>
                          <button
                            type="button"
                            className="homepage-card-action homepage-card-action--danger"
                            onClick={() => handleRequestDeleteManualRoadmap(roadmapId, roadmapTitle)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Đang xóa...' : 'Xóa'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section id="roadmap-community" className="homepage-section homepage-section--plain" aria-label="Roadmap gallery">
          <div className="homepage-roadmap-head">
            <div>
              <h2>Roadmap cộng đồng</h2>
              <p>Được tuyển chọn bởi cộng đồng UET-VNU dành cho mọi sinh viên.</p>
            </div>
            <div className="homepage-roadmap-controls">
              <button
                type="button"
                aria-label="Trước"
                onClick={handlePrevRoadmapPage}
                disabled={!canGoPrevRoadmapPage}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                aria-label="Sau"
                onClick={handleNextRoadmapPage}
                disabled={!canGoNextRoadmapPage}
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          <div className={`homepage-roadmap-grid${isSingleRoadmapCardPage ? ' homepage-roadmap-grid--single' : ''}`}>
            {visibleRoadmapCards.map((card) => (
              <article
                key={card.roadmapId || card.title}
                className="community-roadmap-card"
                onClick={() => navigateTo(`/skill-tree/${encodeURIComponent(card.roadmapId)}`)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigateTo(`/skill-tree/${encodeURIComponent(card.roadmapId)}`); }}
              >
                {/* Thumbnail */}
                <div className="community-roadmap-card__thumbnail">
                  {card.image
                    ? <img src={card.image} alt={card.title} className="community-roadmap-card__thumbnail-img" />
                    : <div className="community-roadmap-card__thumbnail-placeholder" aria-hidden="true" />}
                </div>

                {/* Tags */}
                {(card.tags || []).length > 0 && (
                  <div className="community-roadmap-card__tags">
                    {card.tags.map((tag) => (
                      <span key={tag} className="community-roadmap-card__tag">{tag}</span>
                    ))}
                  </div>
                )}

                <hr className="community-roadmap-card__divider" />

                {/* Body */}
                <div className="community-roadmap-card__body">
                  <div className="community-roadmap-card__title-row">
                    <h3 className="community-roadmap-card__title">{card.title}</h3>
                    <span className="community-roadmap-card__rating">
                      {(card.rating ?? 0).toFixed(1)} <span aria-hidden="true">★</span>
                    </span>
                  </div>

                  <p className="community-roadmap-card__description">{card.description}</p>

                  <div className="community-roadmap-card__footer">
                    {card.nodeCount !== null && (
                      <span className="community-roadmap-card__nodes">
                        {card.nodeCount} nút
                      </span>
                    )}
                    {card.sharedBy.userId ? (
                      <div
                        className="community-roadmap-card__author"
                        onClick={(e) => { e.stopPropagation(); navigateTo(`/public-profile/${encodeURIComponent(card.sharedBy.userId)}`); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigateTo(`/public-profile/${encodeURIComponent(card.sharedBy.userId)}`); } }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="community-roadmap-card__author-label">shared by</span>
                        {card.sharedBy.avatar
                          ? <img src={card.sharedBy.avatar} alt={card.sharedBy.name || 'avatar'} className="community-roadmap-card__author-avatar" />
                          : <span className="community-roadmap-card__author-avatar community-roadmap-card__author-avatar--initial" aria-hidden="true">{card.sharedBy.name ? card.sharedBy.name[0].toUpperCase() : '?'}</span>}
                        <span className="community-roadmap-card__author-name" title={card.sharedBy.name || 'Ẩn danh'}>
                          {(card.sharedBy.name || 'Ẩn danh').length > 16 ? (card.sharedBy.name || 'Ẩn danh').slice(0, 16) + '…' : (card.sharedBy.name || 'Ẩn danh')}
                        </span>
                      </div>
                    ) : (
                      <div className="community-roadmap-card__author">
                        <span className="community-roadmap-card__author-label">shared by</span>
                        {card.sharedBy.avatar
                          ? <img src={card.sharedBy.avatar} alt={card.sharedBy.name || 'avatar'} className="community-roadmap-card__author-avatar" />
                          : <span className="community-roadmap-card__author-avatar community-roadmap-card__author-avatar--initial" aria-hidden="true">{card.sharedBy.name ? card.sharedBy.name[0].toUpperCase() : '?'}</span>}
                        <span className="community-roadmap-card__author-name" title={card.sharedBy.name || 'UETCompass'}>
                          {(card.sharedBy.name || 'UETCompass').length > 16 ? (card.sharedBy.name || 'UETCompass').slice(0, 16) + '…' : (card.sharedBy.name || 'UETCompass')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {!accessToken ? (
          <section
            id="system-flow"
            className="homepage-section homepage-system"
            aria-label="Cách hệ thống vận hành"
          >
            <div className="homepage-section__head homepage-section__head--center">
              <div>
                <h2>Cách hệ thống vận hành</h2>
                <p>Chỉ 3 bước để bắt đầu lộ trình học tập cá nhân hóa.</p>
              </div>
            </div>
            <div className="homepage-system__steps">
              <div className="homepage-system__step">
                <span className="homepage-system__badge">①</span>
                <h3>Tạo tài khoản</h3>
                <p>Đăng ký miễn phí bằng email sinh viên UET.</p>
              </div>
              <span className="homepage-system__arrow" aria-hidden="true">→</span>
              <div className="homepage-system__step">
                <span className="homepage-system__badge">②</span>
                <h3>Hoàn thành onboarding</h3>
                <p>Trả lời vài câu hỏi để hệ thống hiểu mục tiêu của bạn.</p>
              </div>
              <span className="homepage-system__arrow" aria-hidden="true">→</span>
              <div className="homepage-system__step">
                <span className="homepage-system__badge">③</span>
                <h3>Bắt đầu lộ trình</h3>
                <p>Nhận skill tree cá nhân hóa và theo dõi tiến độ theo ngày.</p>
              </div>
            </div>
          </section>
        ): null}

        {!accessToken ? <ReviewCarousel visible /> : null}
        <SiteFooter />
      </main>

      {showOnboardingPanel && typeof document !== 'undefined'
        ? createPortal(
          <div className="homepage-onboarding-overlay">
            <OnboardingPanel
              authToken={accessToken}
              onUnauthorized={logoutAndRedirect}
              onCompleted={handleCloseOnboarding}
              onClose={handleCloseOnboarding}
            />
          </div>,
          document.body
        )
        : null}
      {pendingDeleteRoadmap && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="account-delete-modal-overlay"
            onClick={handleCancelDeleteManualRoadmap}
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận xóa roadmap"
          >
            <div
              className="account-delete-modal"
              role="document"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="account-delete-modal__title-row">
                <AlertTriangle size={18} />
                <h3>Xác nhận xóa roadmap</h3>
              </div>
              <p>
                Bạn có chắc muốn xóa roadmap &quot;{pendingDeleteRoadmap.title}&quot;?
                <br />
                Dữ liệu và tiến độ liên quan sẽ bị xóa vĩnh viễn.
              </p>
              <div className="account-delete-modal__actions">
                <button
                  type="button"
                  className="btn subtle"
                  onClick={handleCancelDeleteManualRoadmap}
                  disabled={Boolean(deletingManualRoadmapId)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn danger solid"
                  onClick={handleDeleteManualRoadmap}
                  disabled={Boolean(deletingManualRoadmapId)}
                >
                  {deletingManualRoadmapId ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
        : null}
    </div>
  );
}
