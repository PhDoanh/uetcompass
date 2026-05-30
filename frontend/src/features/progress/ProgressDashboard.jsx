import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { useAuth } from '../../providers/AuthProvider';
import { getRoadmapNodes, getSummaries, getTrackingTables } from '../../services/progress.api';
import useProgressSSE, { mergeSummaryIntoRoadmaps } from './useProgressSSE';
import { loadManualProgress } from './manualProgress.utils';
import { navigateTo } from '../../shared/navigation';
import SiteFooter from '../general/SiteFooter';
import styles from './progress.module.css';

const ROADMAPS_PER_PAGE = 5;
const MY_MANUAL_ROADMAPS_PREVIEW_LIMIT = 5;

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN');
}

function formatRange(start, end) {
  if (!start || !end) return '--';
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value * 100)}%`;
}

function formatFrequency(value) {
  if (!Number.isFinite(value) || value <= 0) return '--';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function dedupeRoadmapsByRoadmapId(items = []) {
  const finalById = new Map();

  for (const item of items) {
    const roadmapId = String(item?.roadmapId || item?._id || item?.id || '').trim();
    if (!roadmapId) continue;

    const existing = finalById.get(roadmapId);
    if (!existing) {
      finalById.set(roadmapId, item);
      continue;
    }

    const existingUpdated = new Date(existing?.updatedAt || existing?.lastActivityDate || 0).getTime();
    const nextUpdated = new Date(item?.updatedAt || item?.lastActivityDate || 0).getTime();

    const existingIsPrimary = Boolean(existing?.isPrimary || existing?.roadmapSource === 'primary');
    const nextIsPrimary = Boolean(item?.isPrimary || item?.roadmapSource === 'primary');

    if (existingIsPrimary && nextIsPrimary) {
      if (nextUpdated > existingUpdated) {
        finalById.set(roadmapId, item);
      }
      continue;
    }

    if (nextIsPrimary && !existingIsPrimary) {
      finalById.set(roadmapId, item);
      continue;
    }
    if (existingIsPrimary && !nextIsPrimary) {
      continue;
    }

    if (nextUpdated > existingUpdated) {
      finalById.set(roadmapId, item);
    }
  }

  return Array.from(finalById.values());
}

export default function ProgressDashboard() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('');
  const [detailRoadmapId, setDetailRoadmapId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trackingGroupBy, setTrackingGroupBy] = useState('monthly');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);
  const [roadmapPage, setRoadmapPage] = useState(0);
  const [manualProgressSummaries, setManualProgressSummaries] = useState([]);
  const [manualProgressDetails, setManualProgressDetails] = useState({});
  const detailCacheRef = useRef(new Map());

  const primaryProgressRoadmap = useMemo(() => {
    const list = dedupeRoadmapsByRoadmapId(Array.isArray(roadmaps) ? roadmaps : []);
    const allPrimaries = list.filter((item) => item?.isPrimary || item?.roadmapSource === 'primary');
    
    if (allPrimaries.length <= 1) {
      return allPrimaries[0] || list[0] || null;
    }

    return allPrimaries.reduce((newest, current) => {
      const newestTime = new Date(newest?.updatedAt || newest?.lastActivityDate || 0).getTime();
      const currentTime = new Date(current?.updatedAt || current?.lastActivityDate || 0).getTime();
      return currentTime > newestTime ? current : newest;
    });
  }, [roadmaps]);

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

    for (const roadmap of dedupeRoadmapsByRoadmapId(Array.isArray(roadmaps) ? roadmaps : [])) {
      const roadmapId = String(roadmap?.roadmapId || '').trim();
      
      if (!roadmapId || roadmapId === primaryProgressRoadmap?.roadmapId) {
        continue;
      }

      if (roadmap?.roadmapName === primaryProgressRoadmap?.roadmapName) {
        continue;
      }

      cards.push({
        kind: roadmap?.isManual ? 'manual' : 'roadmap',
        id: roadmapId,
        roadmap: manualProgressById.get(roadmapId) || roadmap,
      });
    }

    return dedupeRoadmapsByRoadmapId(cards.map((card) => card.roadmap));
  }, [manualProgressSummaries, primaryProgressRoadmap, roadmaps]);

  const selectedRoadmap = useMemo(
    () => progressRoadmapCards.find((item) => item.roadmapId === selectedRoadmapId) || null,
    [progressRoadmapCards, selectedRoadmapId]
  );

  const handleOpenSkillTree = useCallback((roadmap) => {
    const roadmapId = String(roadmap?.roadmapId || '').trim();
    if (!roadmapId) return;

    if (roadmap?.isManual) {
      navigateTo(`/skill-tree/${encodeURIComponent(roadmapId)}`);
      return;
    }
    navigateTo('/skill-tree');
  }, []);

  const loadSummaries = useCallback(async () => {
    if (!accessToken) {
      setRoadmaps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await getSummaries(accessToken);
      const uniqueItems = dedupeRoadmapsByRoadmapId(items);
      setRoadmaps(uniqueItems);

      if (!selectedRoadmapId && uniqueItems[0]?.roadmapId) {
        setSelectedRoadmapId(uniqueItems[0].roadmapId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedRoadmapId]);

  const loadDetail = useCallback(
    async (roadmapId, { force = false } = {}) => {
      if (!accessToken || !roadmapId) {
        setDetail(null);
        return;
      }

      if (!force && detailCacheRef.current.has(roadmapId)) {
        setDetail(detailCacheRef.current.get(roadmapId));
        setDetailLoading(false);
        return;
      }

      const isManualRoadmap = progressRoadmapCards.some(
        (item) => item.roadmapId === roadmapId && item.isManual
      );
      const manualDetail = manualProgressDetails[roadmapId];
      if (manualDetail) {
        setDetail(manualDetail);
        setDetailLoading(false);
        detailCacheRef.current.set(roadmapId, manualDetail);
        return;
      }

      if (isManualRoadmap) {
        const fallbackDetail = {
          roadmapId,
          roadmapName: selectedRoadmap?.roadmapName || 'Manual roadmap',
          nodes: { done: [], inProgress: [], pending: [] },
          manualMissingData: true,
        };
        setDetail(fallbackDetail);
        setDetailLoading(false);
        detailCacheRef.current.set(roadmapId, fallbackDetail);
        return;
      }

      setDetailLoading(true);
      try {
        const data = await getRoadmapNodes(accessToken, roadmapId);
        setDetail(data);
        detailCacheRef.current.set(roadmapId, data);
      } catch (err) {
        setError(err);
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken, manualProgressDetails, progressRoadmapCards, selectedRoadmap]
  );

  const loadTracking = useCallback(async () => {
    if (!accessToken) {
      setTrackingData(null);
      setTrackingLoading(false);
      return;
    }

    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const data = await getTrackingTables(accessToken, {
        scope: 'all',
        groupBy: trackingGroupBy,
      });
      setTrackingData(data);
    } catch (err) {
      setTrackingError(err);
    } finally {
      setTrackingLoading(false);
    }
  }, [accessToken, trackingGroupBy]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('roadmapId')) return;

    url.searchParams.delete('roadmapId');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!accessToken) {
      setManualProgressSummaries([]);
      setManualProgressDetails({});
      return undefined;
    }

    loadManualProgress(accessToken)
      .then(({ summaries, detailsById }) => {
        if (!isMounted) return;
        setManualProgressSummaries(dedupeRoadmapsByRoadmapId(summaries));
        setManualProgressDetails(detailsById);
      })
      .catch(() => {
        if (!isMounted) return;
        setManualProgressSummaries([]);
        setManualProgressDetails({});
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    loadDetail(detailRoadmapId);
  }, [detailRoadmapId, loadDetail]);

  useEffect(() => {
    if (!selectedRoadmapId && progressRoadmapCards[0]?.roadmapId) {
      setSelectedRoadmapId(progressRoadmapCards[0].roadmapId);
    }
  }, [progressRoadmapCards, selectedRoadmapId]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  useProgressSSE({
    sseToken: accessToken,
    onSummaryUpdated: (summary) => {
      setRoadmaps((current) => mergeSummaryIntoRoadmaps(current, summary));
      if (summary?.roadmapId === detailRoadmapId) {
        loadDetail(detailRoadmapId, { force: true });
      }
      loadTracking();
    },
    onUnauthorized: () => {
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  const summaryBase = trackingData?.summary || {};
  const summaryTotalNodes = summaryBase.totalNodes || 0;
  const summaryCompletedNodes = summaryBase.completedNodes || 0;
  const summaryInProgressNodes = summaryBase.inProgressNodes || 0;
  const summaryActiveNodes = summaryBase.activeNodes || 0;
  const summaryLearningRate = summaryBase.learningRate || (summaryTotalNodes ? summaryInProgressNodes / summaryTotalNodes : 0);
  const summary = {
    totalNodes: summaryTotalNodes,
    completedNodes: summaryCompletedNodes,
    inProgressNodes: summaryInProgressNodes,
    activeNodes: summaryActiveNodes,
    completionRate: summaryBase.completionRate || (summaryTotalNodes ? summaryCompletedNodes / summaryTotalNodes : 0),
    learningRate: summaryLearningRate,
    firstActivityDate: summaryBase.firstActivityDate || null,
  };

  const periods = (trackingData?.buckets || [])
    .slice()
    .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
    .slice(0, 3);

  const doneNodes = detail?.nodes?.done || detail?.doneNodes || [];
  const inProgressNodes = detail?.nodes?.inProgress || detail?.inProgressNodes || [];
  const pendingNodes = detail?.nodes?.pending || detail?.pendingNodes || [];
  const doneCount = doneNodes.length;
  const inProgressCount = inProgressNodes.length;
  const pendingCount = pendingNodes.length;
  const totalNodes = doneCount + pendingCount + inProgressNodes.length;
  const remainingCount = pendingCount;
  const learningRate = totalNodes > 0 ? inProgressCount / totalNodes : 0;
  const learningPercent = Math.round(learningRate * 100);

  const donutData = [
    { name: 'Hoàn thành', value: doneCount, color: '#22c55e' },
    { name: 'Đang học', value: inProgressCount, color: '#f59e0b' },
    { name: 'Chưa học', value: pendingCount, color: '#94a3b8' },
  ];

  const roadmapAcceptedAt = selectedRoadmap?.roadmapAcceptedAt;
  const roadmapCreatedAt = selectedRoadmap?.roadmapCreatedAt;
  const acceptedDate = roadmapAcceptedAt ? new Date(roadmapAcceptedAt) : null;
  const createdDate = roadmapCreatedAt ? new Date(roadmapCreatedAt) : null;
  const activityDates = [...doneNodes, ...inProgressNodes]
    .map((node) => node?.updatedAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  const earliestNodeActivity = activityDates.length
    ? new Date(Math.min(...activityDates.map((value) => value.getTime())))
    : null;
  const summaryFirstActivity = summary.firstActivityDate
    ? new Date(summary.firstActivityDate)
    : null;

  const earliestLearningDate = earliestNodeActivity
    || (summaryFirstActivity && !Number.isNaN(summaryFirstActivity.getTime()) ? summaryFirstActivity : null)
    || (acceptedDate && !Number.isNaN(acceptedDate.getTime()) ? acceptedDate : null)
    || (createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate : null);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfLearning = earliestLearningDate ? new Date(earliestLearningDate) : null;
  if (startOfLearning) {
    startOfLearning.setHours(0, 0, 0, 0);
  }

  const learnedDays = startOfLearning
    ? Math.max(0, Math.floor((startOfToday - startOfLearning) / (24 * 60 * 60 * 1000)))
    : 0;
  const studyFrequency = learnedDays > 0 ? inProgressCount / learnedDays : 0;
  const estimatedCompletionDate = studyFrequency > 0
    ? addDays(startOfToday, Math.ceil(remainingCount / studyFrequency))
    : null;

  const totalRoadmapPages = Math.max(1, Math.ceil(progressRoadmapCards.length / ROADMAPS_PER_PAGE));
  const canGoPrevRoadmapPage = roadmapPage > 0;
  const canGoNextRoadmapPage = roadmapPage < totalRoadmapPages - 1;
  
  const visibleRoadmaps = progressRoadmapCards.slice(
    roadmapPage * ROADMAPS_PER_PAGE,
    (roadmapPage + 1) * ROADMAPS_PER_PAGE
  );
  const hasRoadmapItems = progressRoadmapCards.length > 0;
  const tagToneList = ['blue', 'orange', 'indigo', 'rose', 'emerald', 'amber'];
  const manualMissingData = detail?.manualMissingData;

  if (loading) {
    return <div className="p-6 text-gray-600">Dang tai tien do...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-700">{error.message || 'Khong the tai tien do.'}</div>;
  }

  return (
    <>
      <main className={styles.progressTracking}>
        <header className={styles.progressTrackingHeader}>
          <div>
            <h1 className={styles.progressTrackingTitle}>Theo dõi tiến độ</h1>
            <p className={styles.progressTrackingSubtitle}>Theo dõi tiến độ học tập trên tất cả roadmap của bạn.</p>
          </div>
        </header>

        <section className={styles.sectionCard}>
          <div className={styles.statsHeader}>
            <h2 className={styles.statsTitle}>Tần suất học và tỷ lệ hoàn thành</h2>
            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggleButton} ${trackingGroupBy === 'daily' ? styles.isActive : ''}`}
                onClick={() => setTrackingGroupBy('daily')}
              >
                Ngày
              </button>
              <button
                type="button"
                className={`${styles.toggleButton} ${trackingGroupBy === 'weekly' ? styles.isActive : ''}`}
                onClick={() => setTrackingGroupBy('weekly')}
              >
                Tuần
              </button>
              <button
                type="button"
                className={`${styles.toggleButton} ${trackingGroupBy === 'monthly' ? styles.isActive : ''}`}
                onClick={() => setTrackingGroupBy('monthly')}
              >
                Tháng
              </button>
            </div>
          </div>

          <div className={styles.statsCards}>
            <div className={styles.statsCard}>
              <p className={styles.statsLabel}>Tổng số nốt</p>
              <p className={styles.statsValue}>{summary.totalNodes ?? '--'}</p>
            </div>
            <div className={styles.statsCard}>
              <p className={styles.statsLabel}>Đã hoàn thành</p>
              <p className={styles.statsValue}>{summary.completedNodes ?? '--'}</p>
            </div>
            <div className={styles.statsCard}>
              <p className={styles.statsLabel}>Đang học</p>
              <p className={styles.statsValue}>{summary.inProgressNodes ?? '--'}</p>
            </div>
            <div className={styles.statsCard}>
              <p className={styles.statsLabel}>Tỷ lệ hoàn thành</p>
              <p className={styles.statsValue}>{trackingLoading ? '--' : formatPercent(summary.completionRate)}</p>
            </div>
          </div>

          <div className={styles.statsTable}>
            <div className={`${styles.statsRow} ${styles.statsRowHead}`}>
              <span>Thời gian</span>
              <span>Đang học</span>
              <span>Hoàn thành</span>
              <span>Tỷ lệ</span>
            </div>
            <div className={styles.statsBody}>
              {trackingError ? (
                <div className={styles.statsEmpty}>{trackingError.message || 'Không thể tải thống kê.'}</div>
              ) : trackingLoading ? (
                <div className={styles.statsEmpty}>Đang tải...</div>
              ) : periods.length ? (
                periods.map((period) => (
                  <div key={period.periodStart} className={styles.statsRow}>
                    <span>{period.periodStart || '--'}</span>
                    <span>{period.inProgressNodes ?? '--'}</span>
                    <span>{period.completedNodes ?? '--'}</span>
                    <span>{formatPercent(period.completionRate)}</span>
                  </div>
                ))
              ) : (
                <div className={styles.statsEmpty}>Chưa có dữ liệu thống kê.</div>
              )}
            </div>
          </div>
        </section>

        {hasRoadmapItems ? (
          <section id="my-roadmaps" className="homepage-section homepage-section--plain" aria-label="My roadmap gallery">
            <div className={styles.statsHeader}>
              <div>
                <h2 className={styles.statsTitle}>Các roadmap của tôi</h2>
              </div>
              <div className="homepage-roadmap-controls">
                <button
                  type="button"
                  aria-label="Trước"
                  onClick={() => setRoadmapPage((prev) => Math.max(0, prev - 1))}
                  disabled={!canGoPrevRoadmapPage}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Sau"
                  onClick={() => setRoadmapPage((prev) => Math.min(totalRoadmapPages - 1, prev + 1))}
                  disabled={!canGoNextRoadmapPage}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="homepage-roadmap-grid">
              {visibleRoadmaps.map((roadmap) => {
                const percent = Number.isFinite(roadmap?.progressPercent)
                  ? roadmap.progressPercent
                  : roadmap?.totalNodes
                    ? Math.round(((roadmap?.doneNodes || 0) / roadmap.totalNodes) * 100)
                    : 0;
                const tags = Array.isArray(roadmap?.tags) ? roadmap.tags.slice(0, 3) : [];

                return (
                  <article key={roadmap.roadmapId} className="homepage-roadmap-card">
                    <div className="homepage-roadmap-card__image-wrap">
                      {roadmap.thumbnail ? (
                        <img
                          src={roadmap.thumbnail}
                          alt={roadmap.roadmapName || 'Roadmap'}
                          className="homepage-roadmap-card__image"
                        />
                      ) : (
                        <div className={styles.thumbnailPlaceholder} aria-hidden="true" />
                      )}
                      {tags.length ? (
                        <div className="homepage-roadmap-card__chips">
                          {tags.map((tag, index) => (
                            <span
                              key={`${roadmap.roadmapId}-${tag}`}
                              className={`homepage-chip homepage-chip--${tagToneList[index % tagToneList.length]}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="homepage-roadmap-card__body">
                      <h3 className="homepage-roadmap-card__title">{roadmap.roadmapName || 'Untitled Roadmap'}</h3>
                      <div className={styles.roadmapProgressBlock}>
                        <p className={`${styles.roadmapPercent} homepage-roadmap-card__description`}>
                          Đã hoàn thành {percent}%
                        </p>
                        <p className={styles.roadmapSubtext}>Đang học {roadmap?.inProgressNodes ?? 0} node</p>
                        <div className={styles.progressBar}>
                          <span className={styles.progressBarFill} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                      <div className="homepage-roadmap-card__meta">
                        <small>{roadmap.totalNodes ?? '--'} nốt</small>
                        <button
                          type="button"
                          className="homepage-card-action"
                          onClick={() => handleOpenSkillTree(roadmap)}
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {detailRoadmapId ? (
          <section className={styles.detailSection}>
            <div className={styles.detailGrid}>
              <div className={styles.detailColumn}>
                <div className={styles.detailColumnHeader}>
                  <h3>Các node đã học</h3>
                  <span>{doneCount}</span>
                </div>
                <div className={styles.detailList}>
                  {detailLoading ? (
                    <div className={styles.statsEmpty}>Đang tải...</div>
                  ) : manualMissingData ? (
                    <div className={styles.statsEmpty}>Chưa có dữ liệu tiến độ cho roadmap thủ công.</div>
                  ) : doneNodes.length ? (
                    doneNodes.map((node) => (
                      <div key={node.id || node.nodeId || node.courseCode} className={styles.detailItem}>
                        <strong>{node.name || node.skillName || node.courseName || 'Unknown'}</strong>
                        <span>{node.courseCode || ''}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.statsEmpty}>Chưa có node hoàn thành.</div>
                  )}
                </div>
              </div>

              <div className={styles.detailColumn}>
                <div className={styles.detailColumnHeader}>
                  <h3>Các node chưa học</h3>
                  <span>{pendingCount}</span>
                </div>
                <div className={styles.detailList}>
                  {detailLoading ? (
                    <div className={styles.statsEmpty}>Đang tải...</div>
                  ) : manualMissingData ? (
                    <div className={styles.statsEmpty}>Chưa có dữ liệu tiến độ cho roadmap thủ công.</div>
                  ) : pendingNodes.length ? (
                    pendingNodes.map((node) => (
                      <div key={node.id || node.nodeId || node.courseCode} className={styles.detailItem}>
                        <strong>{node.name || node.skillName || node.courseName || 'Unknown'}</strong>
                        <span>{node.courseCode || ''}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.statsEmpty}>Chưa có node chưa học.</div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.detailBottom}>
              <div className={styles.donutCard}>
                <div style={{ width: 160, height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" innerRadius={52} outerRadius={70} paddingAngle={3}>
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                        <Label value={`${totalNodes}`} position="center" className={styles.donutValue} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className={styles.donutLabel}>Tình trạng roadmap</p>
                <p className={styles.donutMeta}>Tổng số node: {totalNodes}</p>
                <div className={styles.donutLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#22c55e' }} />
                    <span>Hoàn thành</span>
                    <strong>{doneCount}</strong>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }} />
                    <span>Đang học</span>
                    <strong>{inProgressCount}</strong>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#94a3b8' }} />
                    <span>Chưa học</span>
                    <strong>{pendingCount}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Tần suất học</p>
                <p className={styles.metricValue}>{formatFrequency(studyFrequency)} nodes / ngày</p>
                <p className={styles.metricHint}>Tỷ lệ đang học: {learningPercent}%</p>
              </div>

              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Bắt đầu học</p>
                <p className={styles.metricValue}>{formatDate(earliestLearningDate)}</p>
              </div>

              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Dự đoán ngày hoàn thành</p>
                <p className={styles.metricValue}>{formatDate(estimatedCompletionDate)}</p>
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}