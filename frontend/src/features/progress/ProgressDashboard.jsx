import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../providers/AuthProvider';
import { getRoadmapNodes, getSummaries, getTrackingTables } from '../../services/progress.api';
import useProgressSSE, { mergeSummaryIntoRoadmaps } from './useProgressSSE';
import { getRoadmapIdFromLocation } from './progress.utils';
import SiteFooter from '../general/SiteFooter';
import styles from './progress.module.css';

const ROADMAPS_PER_PAGE = 4;

function updateRoadmapIdInLocation(roadmapId) {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  if (roadmapId) {
    url.searchParams.set('roadmapId', roadmapId);
  } else {
    url.searchParams.delete('roadmapId');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

function formatDate(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleDateString('vi-VN');
}

function formatRange(start, end) {
  if (!start || !end) {
    return '--';
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return `${Math.round(value * 100)}%`;
}

export default function ProgressDashboard() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(() =>
    typeof window === 'undefined' ? '' : getRoadmapIdFromLocation(window.location.search)
  );
  const [detailRoadmapId, setDetailRoadmapId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trackingGroupBy, setTrackingGroupBy] = useState('monthly');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);
  const [roadmapPage, setRoadmapPage] = useState(0);

  const selectedRoadmap = useMemo(
    () => roadmaps.find((item) => item.roadmapId === selectedRoadmapId) || null,
    [roadmaps, selectedRoadmapId]
  );

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
      setRoadmaps(items);

      if (!selectedRoadmapId && items[0]?.roadmapId) {
        setSelectedRoadmapId(items[0].roadmapId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedRoadmapId]);

  const loadDetail = useCallback(
    async (roadmapId) => {
      if (!accessToken || !roadmapId) {
        setDetail(null);
        return;
      }

      setDetailLoading(true);
      try {
        const data = await getRoadmapNodes(accessToken, roadmapId);
        setDetail(data);
      } catch (err) {
        setError(err);
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken]
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
    updateRoadmapIdInLocation(detailRoadmapId || selectedRoadmapId);
    loadDetail(detailRoadmapId);
  }, [detailRoadmapId, selectedRoadmapId, loadDetail]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  useProgressSSE({
    sseToken: accessToken,
    onSummaryUpdated: (summary) => {
      setRoadmaps((current) => mergeSummaryIntoRoadmaps(current, summary));
      if (summary?.roadmapId === detailRoadmapId) {
        loadDetail(detailRoadmapId);
      }
      loadTracking();
    },
    onUnauthorized: () => {
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  const summary = trackingData?.summary || {};
  const periods = trackingData?.buckets?.slice(0, 3) || [];
  const doneNodes = detail?.nodes?.done || detail?.doneNodes || [];
  const pendingNodes = detail?.nodes?.pending || detail?.pendingNodes || [];
  const doneCount = doneNodes.length;
  const pendingCount = pendingNodes.length;
  const completionRate = Number.isFinite(selectedRoadmap?.progressPercent)
    ? selectedRoadmap.progressPercent / 100
    : doneCount + pendingCount > 0
      ? doneCount / (doneCount + pendingCount)
      : 0;
  const donutData = [
    { name: 'Pending', value: Math.max(0, 1 - completionRate) },
    { name: 'Done', value: completionRate },
  ];

  const totalRoadmapPages = Math.max(1, Math.ceil(roadmaps.length / ROADMAPS_PER_PAGE));
  const canGoPrevRoadmapPage = roadmapPage > 0;
  const canGoNextRoadmapPage = roadmapPage < totalRoadmapPages - 1;
  const visibleRoadmaps = roadmaps.slice(
    roadmapPage * ROADMAPS_PER_PAGE,
    (roadmapPage + 1) * ROADMAPS_PER_PAGE
  );
  const tagToneList = ['blue', 'orange', 'indigo', 'rose', 'emerald', 'amber'];

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
              className={`${styles.toggleButton} ${trackingGroupBy === 'monthly' ? styles.isActive : ''}`}
              onClick={() => setTrackingGroupBy('monthly')}
            >
              Tháng
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${trackingGroupBy === 'weekly' ? styles.isActive : ''}`}
              onClick={() => setTrackingGroupBy('weekly')}
            >
              Tuần
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
            <p className={styles.statsLabel}>Tỷ lệ hoàn thành</p>
            <p className={styles.statsValue}>
              {trackingLoading ? '--' : formatPercent(summary.completionRate)}
            </p>
          </div>
        </div>

        <div className={styles.statsTable}>
          <div className={`${styles.statsRow} ${styles.statsRowHead}`}>
            <span>Thời gian</span>
            <span>Nốt hoạt động</span>
            <span>Hoàn thành</span>
            <span>Tỷ lệ</span>
          </div>
          <div className={styles.statsBody}>
            {trackingError ? (
              <div className={styles.statsEmpty}>{trackingError.message || 'Không thể tải thống kê.'}</div>
            ) : periods.length ? (
              periods.map((period) => (
                <div key={`${period.periodStart}-${period.periodEnd}`} className={styles.statsRow}>
                  <span>{formatRange(period.periodStart, period.periodEnd)}</span>
                  <span>{period.activeNodes ?? period.activeDays ?? '--'}</span>
                  <span>{period.completedNodes ?? '--'}</span>
                  <span>{formatPercent(period.completionRate)}</span>
                </div>
              ))
            ) : (
              <div className={styles.statsEmpty}>{trackingLoading ? 'Đang tải...' : 'Chưa có dữ liệu.'}</div>
            )}
          </div>
        </div>
      </section>

      <section
            id="my-roadmaps"
            className="homepage-section homepage-section--plain"
            aria-label="My roadmap gallery"
          >
        <div className="homepage-roadmap-head">
          <div>
            <h2>Các roadmap của tôi</h2>
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
                ? Math.round((roadmap?.doneNodes || 0) / roadmap.totalNodes * 100)
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
                  <p className="homepage-roadmap-card__description">Đã hoàn thành {percent}%</p>
                  <div className={styles.progressBar}>
                    <span className={styles.progressBarFill} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="homepage-roadmap-card__meta">
                    <small>{roadmap.totalNodes ?? '--'} nốt</small>
                    <button
                      type="button"
                      className="homepage-card-action"
                      onClick={() => {
                        if (detailRoadmapId === roadmap.roadmapId) {
                            setDetailRoadmapId('');
                        } else {
                            setSelectedRoadmapId(roadmap.roadmapId);
                            setDetailRoadmapId(roadmap.roadmapId);
                        }
                      }}
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
                      <Cell fill="var(--pastel-lavender)" />
                      <Cell fill="var(--pastel-pink)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.donutLabel}>Tỉ lệ hoàn thành</p>
              <div className={styles.donutLegend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendDotPending}`} />
                  <span>Chưa học</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendDotDone}`} />
                  <span>Đã học</span>
                </div>
              </div>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Tần suất học</p>
              <p className={styles.metricValue}>{detail?.dailyFrequency ?? '--'} nodes / ngay</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Dự đoán ngày hoàn thành</p>
              <p className={styles.metricValue}>{formatDate(detail?.estimatedCompletion)}</p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
    <SiteFooter />
    </>
  );
}
