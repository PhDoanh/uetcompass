import React, { useEffect, useMemo, useState } from 'react';
import { Cell, Label, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Star, X } from 'lucide-react';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import { getNextTransitionOptions } from './skillTree.types';

const MAX_RATING = 5;

function toLabel(state) {
  if (state === 'inProgress') return 'In Progress';
  if (state === 'completed') return 'Completed';
  if (state === 'skip') return 'Skip';
  return 'Pending';
}

function toNodeTypeLabel(mode, nodeType) {
  if (mode === 'public') {
    return nodeType === 'sub_topic' ? 'Subtopic' : 'Topic';
  }
  return nodeType === 'topic' ? 'Topic' : 'Subtopic';
}

function formatHistoryEventSummary(event) {
  if (typeof event?.summary === 'string' && event.summary.trim()) {
    return event.summary;
  }

  if (event?.eventType === 'node_transition' && event?.nodeTransition) {
    const nodeLabel = event.nodeTransition.nodeLabel || event.nodeTransition.nodeId || 'Node';
    return `${nodeLabel}: ${toLabel(event.nodeTransition.fromState)} → ${toLabel(event.nodeTransition.toState)}`;
  }

  if (event?.eventType === 'milestone_achieved' && event?.milestone) {
    const milestoneTitle = event.milestone.milestoneTitle || 'milestone';
    const milestonePercent = event.milestone.milestonePercent != null ? ` (${event.milestone.milestonePercent}%)` : '';
    return `Đạt ${milestoneTitle}${milestonePercent}`;
  }

  return 'Lịch sử cập nhật';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function formatFrequency(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '--';
  }

  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
}

export function calculateProgress(nodes, getState) {
  const total = Array.isArray(nodes) ? nodes.length : 0;
  if (!total) {
    return { total: 0, completed: 0, percent: 0 };
  }

  const completed = nodes.filter((node) => getState(node) === 'completed').length;
  const percent = Math.round((completed / total) * 100);

  return { total, completed, percent };
}

export function buildFixedMilestones() {
  return [
    { id: '25', title: 'Getting Started', percent: 25, color: '#ef4444' },
    { id: '50', title: 'Halfway', percent: 50, color: '#f97316' },
    { id: '75', title: 'Almost there', percent: 75, color: '#0ea5e9' },
    { id: '100', title: 'Complete', percent: 100, color: '#22c55e' },
  ].map((milestone) => ({
    ...milestone,
    description: `${milestone.percent}%`,
  }));
}

export function buildClusterMilestones(
  nodes,
  {
    getNodeId,
    getParentId,
    getLabel,
    isParent,
    fallbackLabel = 'Khác',
  } = {}
) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (list.length === 0) {
    return [];
  }

  const resolveNodeId = getNodeId || ((node) => node?.nodeId);
  const resolveParentId = getParentId || ((node) => node?.parentNodeId);
  const resolveLabel = getLabel || ((node) => node?.label || node?.skillName || node?.nodeId);
  const isParentNode = isParent || ((node) => !resolveParentId(node));

  const parents = [];
  const parentSet = new Set();
  list.forEach((node) => {
    if (!isParentNode(node)) {
      return;
    }

    const nodeId = resolveNodeId(node);
    if (!nodeId || parentSet.has(nodeId)) {
      return;
    }

    parentSet.add(nodeId);
    parents.push(node);
  });

  const childByParent = new Map();
  list.forEach((node) => {
    const parentId = resolveParentId(node);
    if (!parentId || !parentSet.has(parentId)) {
      return;
    }

    const group = childByParent.get(parentId) || [];
    group.push(node);
    childByParent.set(parentId, group);
  });

  const milestones = [];
  const usedNodeIds = new Set();

  parents.forEach((parent) => {
    const parentId = resolveNodeId(parent);
    if (!parentId) {
      return;
    }

    const children = childByParent.get(parentId) || [];
    const nodeCount = 1 + children.length;

    usedNodeIds.add(parentId);
    children.forEach((child) => {
      const childId = resolveNodeId(child);
      if (childId) {
        usedNodeIds.add(childId);
      }
    });

    milestones.push({
      id: parentId,
      title: resolveLabel(parent) || 'Milestone',
      nodeCount,
    });
  });

  const orphanCount = list.filter((node) => {
    const nodeId = resolveNodeId(node);
    return nodeId && !usedNodeIds.has(nodeId);
  }).length;

  if (orphanCount > 0) {
    milestones.push({
      id: 'other',
      title: fallbackLabel || 'Khác',
      nodeCount: orphanCount,
    });
  }

  const totalCount = list.length;
  let cumulative = 0;

  return milestones.map((milestone, index) => {
    cumulative += milestone.nodeCount;
    const percent = clamp(Math.round((cumulative / totalCount) * 100), 0, 100);
    return {
      ...milestone,
      percent,
      description: `${milestone.nodeCount} nút · Mốc ${percent}%`,
      order: index,
    };
  });
}

export function SkillTreeOverviewTab({
  title,
  description,
  metaItems = [],
  showRoadmapTitle = true,
  progress,
  progressStats = null,
  historyEvents = [],
  showHistory = false,
  actions,
}) {
  const progressPercent = progress?.percent ?? 0;
  const progressLabel = progress?.total
    ? `${progress?.completed ?? 0}/${progress.total} nút (${progressPercent}%)`
    : 'Chưa có dữ liệu tiến độ';

  const donutData = useMemo(() => {
    if (!progressStats?.totalNodes) {
      return [];
    }

    return [
      { name: 'Hoàn thành', value: progressStats.doneNodes || 0, color: '#22c55e' },
      { name: 'Đang học', value: progressStats.inProgressNodes || 0, color: '#f59e0b' },
      { name: 'Chưa học', value: progressStats.pendingNodes || 0, color: '#94a3b8' },
    ];
  }, [progressStats]);

  const hasProgressStats = Boolean(progressStats?.totalNodes);
  const learningPercent = hasProgressStats && progressStats.totalNodes
    ? Math.round((progressStats.inProgressNodes / progressStats.totalNodes) * 100)
    : 0;
  const nodesPerDayLabel = formatFrequency(progressStats?.nodesPerDay);
  const nodesPerDayText = nodesPerDayLabel === '--' ? '--' : `${nodesPerDayLabel} nodes / ngày`;
  const startDateLabel = formatDate(progressStats?.startDate);
  const estimatedCompletionLabel = formatDate(progressStats?.estimatedCompletionDate);

  return (
    <div className="skill-tree-tab">
      {actions ? (
        <div className="skill-tree-overview__actions">
          {actions}
        </div>
      ) : null}

      <section className="resources-tab__section">
        <h4 className="resources-tab__heading">Tổng quan roadmap</h4>
        <dl className="skill-tree-overview__meta-grid">
          {[
            ...(showRoadmapTitle ? [{ label: 'Tên roadmap', value: title }] : []),
            { label: 'Mô tả', value: description },
            ...metaItems,
          ].map((item) => (
            <div key={item.label} className="skill-tree-overview__meta-item">
              <dt>{item.label}</dt>
              <dd>{item.value ?? 'Chưa có'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="skill-tree-overview__progress-row">
        <section className="resources-tab__section skill-tree-overview__progress-section">
          <div className="skill-tree-overview__progress-head">
            <h4 className="resources-tab__heading">Tiến độ</h4>
            <p className="skill-tree-overview__progress-summary">{progressLabel}</p>
          </div>

          <div className="skill-tree-overview__progress-body">
            {hasProgressStats ? (
              <div className="skill-tree-overview__progress-dashboard">
                <article className="skill-tree-overview__progress-card">
                  <div className="skill-tree-overview__donut-wrap">
                    <div className="skill-tree-overview__donut" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3}>
                            {donutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                            <Label
                              value={`${progressStats.totalNodes}`}
                              position="center"
                              className="skill-tree-overview__donut-value"
                            />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <p className="skill-tree-overview__donut-label">Tình trạng roadmap</p>
                  <p className="skill-tree-overview__donut-meta">Tổng số node: {progressStats.totalNodes}</p>
                  <div className="skill-tree-overview__donut-legend">
                    <div className="skill-tree-overview__legend-item">
                      <span className="skill-tree-overview__legend-dot" style={{ backgroundColor: '#22c55e' }} />
                      <span>Hoàn thành</span>
                      <strong>{progressStats.doneNodes}</strong>
                    </div>
                    <div className="skill-tree-overview__legend-item">
                      <span className="skill-tree-overview__legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                      <span>Đang học</span>
                      <strong>{progressStats.inProgressNodes}</strong>
                    </div>
                    <div className="skill-tree-overview__legend-item">
                      <span className="skill-tree-overview__legend-dot" style={{ backgroundColor: '#94a3b8' }} />
                      <span>Chưa học</span>
                      <strong>{progressStats.pendingNodes}</strong>
                    </div>
                  </div>
                </article>

                <div className="skill-tree-overview__metric-grid">
                  <article className="skill-tree-overview__metric-card">
                    <p className="skill-tree-overview__metric-label">Tần suất học</p>
                    <p className="skill-tree-overview__metric-value">{nodesPerDayText}</p>
                    <p className="skill-tree-overview__metric-hint">Tỷ lệ đang học: {learningPercent}%</p>
                  </article>
                  <article className="skill-tree-overview__metric-card">
                    <p className="skill-tree-overview__metric-label">Bắt đầu học</p>
                    <p className="skill-tree-overview__metric-value">{startDateLabel}</p>
                  </article>
                  <article className="skill-tree-overview__metric-card">
                    <p className="skill-tree-overview__metric-label">Dự đoán ngày hoàn thành</p>
                    <p className="skill-tree-overview__metric-value">{estimatedCompletionLabel}</p>
                  </article>
                </div>
              </div>
            ) : (
              <p className="skill-tree-muted-text">Chưa có dữ liệu tiến độ để hiển thị biểu đồ.</p>
            )}
          </div>
        </section>

        {showHistory ? (
          <div className="skill-tree-overview__history-card">
            <div className="skill-tree-overview__history-head">
              <h5 className="skill-tree-overview__history-title">Lịch sử</h5>
              <p className="skill-tree-overview__history-subtitle">Cập nhật mới nhất</p>
            </div>
            {historyEvents.length === 0 ? (
              <p className="skill-tree-muted-text">Chưa có lịch sử. Hãy cập nhật trạng thái hoặc hoàn thành milestone.</p>
            ) : (
              <ol className="skill-tree-overview__history-list">
                {historyEvents.map((event) => (
                    <li key={event._id || event.id} className="skill-tree-overview__history-item">
                    <div className="skill-tree-overview__history-time">
                        {event.timestampLabel || event.timestamp || (event.occurredAt ? new Date(event.occurredAt).toLocaleString() : '')}
                    </div>
                    <div className="skill-tree-overview__history-text">
                        {formatHistoryEventSummary(event)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkillTreeNodeDetailTab({
  node,
  mode = 'personal',
  onClearSelection,
  onTransition,
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const nodeState = mode === 'public' ? node?.status : node?.progressState;
  const resolvedState = nodeState || 'pending';
  const nextOptions = useMemo(
    () => getNextTransitionOptions(resolvedState),
    [resolvedState]
  );

  const handleTransition = async (toState) => {
    if (!toState || toState === resolvedState || !onTransition) {
      return;
    }

    try {
      setIsUpdating(true);
      await onTransition(resolvedState, toState);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!node) {
    return (
      <div className="skill-tree-tab">
        <p className="skill-tree-muted-text">Chọn một nút để xem chi tiết.</p>
      </div>
    );
  }

  const title = mode === 'public' ? node?.label || node?.nodeId : node?.skillName || node?.nodeId;
  const subtitle = toNodeTypeLabel(mode, mode === 'public' ? node?.type : node?.nodeType);
  const description = mode === 'public' ? node?.description : node?.reason;
  const resources = Array.isArray(node?.resources) ? node.resources : [];
  const relatedCourses = Array.isArray(node?.relatedCourses) ? node.relatedCourses : [];
  const normalizedPublicResources = useMemo(() => {
    if (mode !== 'public') {
      return [];
    }

    return resources
      .map((resource, index) => {
        if (typeof resource === 'string') {
          const trimmed = resource.trim();
          if (!trimmed) return null;
          return {
            title: `Resource ${index + 1}`,
            url: trimmed,
          };
        }

        if (!resource || typeof resource !== 'object') {
          return null;
        }

        const title = String(resource.title || resource.name || `Resource ${index + 1}`).trim();
        const url = String(resource.url || resource.link || '').trim();
        if (!url) {
          return null;
        }

        return { title, url };
      })
      .filter(Boolean);
  }, [mode, resources]);

  return (
    <div className="skill-tree-tab">
      <div className="skill-tree-panel__title-row">
        <div className="skill-tree-panel__title-wrap">
          <h3 className="skill-tree-panel__title">{title}</h3>
          <p className="skill-tree-panel__subtitle">{subtitle}</p>
        </div>
        {onClearSelection ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="skill-tree-icon-button"
            aria-label="Bỏ chọn nút"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="skill-tree-panel__status-row">
        <span className={`skill-tree-status-chip skill-tree-status-chip--${resolvedState}`}>
          {toLabel(resolvedState)}
        </span>
      </div>

      <div className="skill-tree-panel__transition-block">
        <label className="skill-tree-select-label" htmlFor="status-select">
          Move state
        </label>
        <select
          id="status-select"
          value=""
          onChange={(event) => handleTransition(event.target.value)}
          disabled={isUpdating}
          className="skill-tree-status-select"
        >
          <option value="" disabled>
            Select next state
          </option>
          {nextOptions.map((option) => (
            <option key={option} value={option}>
              {toLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <section className="resources-tab__section">
        <h4 className="resources-tab__heading">{mode === 'public' ? 'Description' : 'Why this skill?'}</h4>
        {String(description || '').trim() ? (
          <p className="why-tab__content">{description}</p>
        ) : (
          <p className="skill-tree-muted-text">No description available</p>
        )}
      </section>

      <section className="resources-tab__section">
        <h4 className="resources-tab__heading">Resources</h4>
        {(mode === 'public' ? normalizedPublicResources.length : resources.length) === 0 ? (
          <p className="skill-tree-muted-text">No resources available</p>
        ) : (
          <ul className={mode === 'public' ? 'sample-resource-list' : 'resources-tab__list'}>
            {(mode === 'public' ? normalizedPublicResources : resources).map((resource, index) => (
              <li
                key={`resource-${index}`}
                className={mode === 'public' ? 'sample-resource-list__item' : 'resources-tab__item'}
              >
                {mode === 'public' ? (
                  <div>
                    <p className="sample-resource-list__title">{resource.title}</p>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="sample-resource-list__link"
                    >
                      {resource.url}
                    </a>
                  </div>
                ) : (
                  <pre className="skill-tree-json-preview">{JSON.stringify(resource, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {mode === 'personal' ? (
        <section className="resources-tab__section">
          <h4 className="resources-tab__heading">Related Courses</h4>
          {relatedCourses.length === 0 ? (
            <p className="skill-tree-muted-text">No related courses available</p>
          ) : (
            <ul className="resources-tab__list">
              {relatedCourses.map((course) => (
                <li key={`${node.nodeId}-${course.courseCode}`} className="resources-tab__item">
                  <div className="resources-tab__title">{course.courseCode} - {course.courseName}</div>
                  <p className="resources-tab__description">Credits: {course.credits}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function SkillTreeReviewTab({ roadmapId = '', authToken = '', initialReviews = [] }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState(initialReviews);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const renderRatingStars = (value) => {
    const safeRating = Math.max(0, Math.min(MAX_RATING, Number(value) || 0));

    return (
      <span className="skill-tree-review__stars skill-tree-review__stars--display" aria-label={`${safeRating} sao`}>
        {Array.from({ length: MAX_RATING }).map((_, index) => {
          const starValue = index + 1;
          return (
            <Star
              key={`review-star-${starValue}`}
              size={14}
              fill={starValue <= safeRating ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          );
        })}
      </span>
    );
  };

  const formatDateLabel = (review) => {
    const rawDate = review?.date || review?.commentedAt || review?.createdAt || '';
    if (!rawDate) {
      return '';
    }

    const parsedDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return String(rawDate);
    }

    return parsedDate.toLocaleString('vi-VN');
  };

  useEffect(() => {
    setReviews(initialReviews || []);
  }, [initialReviews]);

  const handleSubmit = async () => {
    const trimmed = comment.trim();
    if (!trimmed || rating === 0) {
      return;
    }

    if (!roadmapId) {
      setSubmitError('Thiếu roadmap để lưu nhận xét.');
      return;
    }

    if (!authToken) {
      setSubmitError('Vui lòng đăng nhập để gửi nhận xét.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');

      const response = await manualRoadmapApi.createManualRoadmapComment(
        authToken,
        roadmapId,
        { content: trimmed, rating }
      );

      const nextReview = response || {
        id: `review-${Date.now()}`,
        author: 'Bạn',
        rating,
        content: trimmed,
        date: new Date().toLocaleString('vi-VN'),
      };

      setReviews((prev) => [nextReview, ...prev]);
      setComment('');
      setRating(0);
    } catch (error) {
      setSubmitError(error?.message || 'Không thể lưu nhận xét.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="skill-tree-tab">
      <section className="resources-tab__section">
        <h4 className="resources-tab__heading">Đánh giá roadmap cộng đồng</h4>
        <div className="skill-tree-review__stars" role="radiogroup" aria-label="Chọn số sao">
          {Array.from({ length: MAX_RATING }).map((_, index) => {
            const starValue = index + 1;
            return (
              <button
                type="button"
                key={`star-${starValue}`}
                className={`skill-tree-review__star-btn ${rating >= starValue ? 'is-active' : ''}`}
                onClick={() => setRating(starValue)}
                aria-pressed={rating === starValue}
                aria-label={`${starValue} sao`}
              >
                <Star size={16} fill={rating >= starValue ? 'currentColor' : 'none'} />
              </button>
            );
          })}
        </div>

        <textarea
          className="skill-tree-review__input"
          rows={4}
          placeholder="Chia sẻ cảm nhận của bạn về roadmap này..."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        {!authToken ? (
          <p className="skill-tree-muted-text">Đăng nhập để gửi nhận xét và lưu lịch sử comment.</p>
        ) : null}

        {submitError ? <p className="skill-tree-muted-text" style={{ color: '#b91c1c' }}>{submitError}</p> : null}

        <div className="skill-tree-review__submit">
          <button
            type="button"
            className="skill-tree-review__submit-btn"
            onClick={handleSubmit}
            disabled={!comment.trim() || rating === 0 || submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </section>

      <section className="resources-tab__section">
        <h4 className="resources-tab__heading">Nhận xét gần đây</h4>
        <ul className="skill-tree-review__list">
          {reviews.length === 0 ? (
            <li className="skill-tree-review__card">
              <p className="skill-tree-review__content">Chưa có đánh giá nào. Hãy là người đầu tiên để lại nhận xét.</p>
            </li>
          ) : (
            reviews.map((review, index) => (
              <li
                key={review.id || `${review.author || 'review'}-${review.date || index}`}
                className="skill-tree-review__card"
              >
                <div className="skill-tree-review__card-head">
                  <p className="skill-tree-review__author">{review.author}</p>
                  <div className="skill-tree-review__rating">
                    {renderRatingStars(review.rating)}
                  </div>
                </div>
                <p className="skill-tree-review__content">{review.content}</p>
                <p className="skill-tree-review__date">{formatDateLabel(review) || review.date}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export default function SkillTreeDetailPanel({
  title,
  tabs = [],
  activeTabId,
  onTabChange,
  headerActions,
  style,
}) {
  const resolvedTab = tabs.find((tab) => tab.id === activeTabId && !tab.disabled)
    || tabs.find((tab) => !tab.disabled)
    || tabs[0];

  return (
    <aside
      className="skill-tree-panel skill-tree-panel--inline skill-tree-layout__panel"
      aria-label="Skill tree detail panel"
      style={style}
    >
      <div className="skill-tree-panel__header skill-tree-panel__header--tabs">
        <div className="skill-tree-panel__title-row">
          <div className="skill-tree-panel__title-wrap">
            <h2 className="skill-tree-panel__title">{title}</h2>
            <p className="skill-tree-panel__subtitle">{subtitle}</p>
          </div>
          {headerActions ? (
            <div className="skill-tree-panel__title-actions">
              {headerActions}
            </div>
          ) : null}
        </div>
        <div className="skill-tree-panel__tab-list">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`skill-tree-panel__tab-btn ${tab.id === activeTabId ? 'is-active' : ''}`}
              onClick={() => onTabChange?.(tab.id)}
              disabled={tab.disabled}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="skill-tree-panel__content">
        {resolvedTab?.content || null}
      </div>
    </aside>
  );
}
