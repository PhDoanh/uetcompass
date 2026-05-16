import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as skillTreeApi from '../../services/skillTree.api';
import { useSkillTree } from './useSkillTree';
import SkillTreeCanvas from './SkillTreeCanvas';
import CourseDetailPanel from './CourseDetailPanel';
import { useNotification } from '../notification/NotificationContainer';
import { useSplitLayout } from './useSplitLayout';
import SkillTreeDetailPanel, { calculateProgress, buildFixedMilestones, SkillTreeOverviewTab, SkillTreeNodeDetailTab } from './SkillTreeDetailPanel';
import MilestoneCelebrationModal from './MilestoneCelebrationModal';
import ManualRoadmapDividerHandle from '../manual-roadmap/ManualRoadmapDividerHandle';
import './skill-tree.css';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.8;
const ZOOM_STEP = 0.15;

function clampZoom(value) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

export default function SkillTreePage() {
  const [zoom, setZoom] = useState(1);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const canvasViewportRef = useRef(null);
  const zoomContentRef = useRef(null);
  const autoFittedRef = useRef(false);
  const milestoneTriggeredRef = useRef(new Set());
  const previousPercentRef = useRef(0);
  const celebrationInitializedRef = useRef(false);
  const celebrationTimerRef = useRef(null);

  const {
    nodes,
    edges,
    roadmapId,
    roadmapName,
    createdAt,
    acceptedAt,
    activeNodeId,
    isRetryable,
    repersonalizing,
    generationStatus,
    loading,
    error,
    openNode,
    closeNode,
    transitionNode,
  } = useSkillTree();

  const activeNode = nodes?.find((n) => n.nodeId === activeNodeId);
  const hasNodes = (nodes || []).length > 0;
  const roadmapCreatedAt = createdAt || acceptedAt;
  const roadmapCreatedLabel = roadmapCreatedAt ? new Date(roadmapCreatedAt).toLocaleString() : 'Not available';
  const roadmapTitle = roadmapName || 'Roadmap cá nhân';
  const roadmapDescription = 'Your personalized roadmap';

  const {
    layoutRef,
    ratio,
    isCompactLayout,
    minRatio,
    maxRatio,
    handleResizePointerDown,
    handleResizeKeyDown,
  } = useSplitLayout();

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (activeNode) {
      setActiveTab('node');
      return;
    }

    setActiveTab('overview');
  }, [activeNode]);

  const progressSummary = useMemo(
    () => calculateProgress(nodes || [], (node) => node.progressState),
    [nodes]
  );

  const milestones = useMemo(() => buildFixedMilestones(), []);

  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!roadmapId) {
      setHistoryEvents([]);
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || '';
      const payload = await skillTreeApi.getRoadmapHistory(token, roadmapId, 50);
      setHistoryEvents(Array.isArray(payload?.items) ? payload.items : []);
    } catch {
      setHistoryEvents([]);
    }
  }, [roadmapId]);

  const overviewMetaItems = useMemo(() => ([
    { label: 'Ngày tạo', value: roadmapCreatedLabel },
    { label: 'Số node', value: hasNodes ? `${nodes.length}` : '0' },
  ]), [hasNodes, nodes.length, roadmapCreatedLabel]);

  const handleNodeTransition = useCallback(async (fromState, toState) => {
    if (!activeNode) {
      return;
    }

    await transitionNode(activeNode.nodeId, fromState, toState);
    await refreshHistory();
  }, [activeNode, refreshHistory, transitionNode]);

  const handleRightClickToggle = useCallback(async (event, node) => {
    event.preventDefault();
    event.stopPropagation();

    if (!node?.nodeId) {
      return;
    }

    const currentState = node.progressState || 'pending';
    const targetState = currentState === 'completed' ? 'pending' : 'completed';

    await transitionNode(node.nodeId, currentState, targetState);
    await refreshHistory();
  }, [refreshHistory, transitionNode]);

  useEffect(() => {
    if (!hasNodes) {
      milestoneTriggeredRef.current.clear();
      previousPercentRef.current = 0;
      celebrationInitializedRef.current = false;
      return;
    }

    const currentPercent = progressSummary.percent || 0;
    const previousPercent = previousPercentRef.current || 0;

    if (!celebrationInitializedRef.current) {
      celebrationInitializedRef.current = true;
      previousPercentRef.current = currentPercent;
      return;
    }

    if (currentPercent <= previousPercent) {
      previousPercentRef.current = currentPercent;
      return;
    }

    const orderedMilestones = [...milestones].sort((a, b) => a.percent - b.percent);
    for (const milestone of orderedMilestones) {
      if (
        currentPercent >= milestone.percent
        && previousPercent < milestone.percent
        && !milestoneTriggeredRef.current.has(milestone.id)
      ) {
        milestoneTriggeredRef.current.add(milestone.id);
        setCelebration({ milestone, roadmapTitle });
        break;
      }
    }

    previousPercentRef.current = currentPercent;
  }, [hasNodes, milestones, progressSummary.percent, roadmapTitle]);

  const detailTabs = useMemo(() => ([
    {
      id: 'overview',
      label: 'Tổng quan',
      content: (
        <SkillTreeOverviewTab
          title={roadmapTitle}
          description={roadmapDescription}
          metaItems={overviewMetaItems}
          showRoadmapTitle={false}
          progress={progressSummary}
          milestones={milestones}
          progressVariant="fixed"
          historyEvents={historyEvents}
          showHistory
        />
      ),
    },
    {
      id: 'node',
      label: 'Chi tiết nút',
      disabled: !activeNode,
      content: (
        <SkillTreeNodeDetailTab
          mode="personal"
          node={activeNode}
          onClearSelection={closeNode}
          onTransition={activeNode ? handleNodeTransition : undefined}
        />
      ),
    },
  ]), [activeNode, closeNode, handleNodeTransition, historyEvents, milestones, overviewMetaItems, progressSummary, roadmapDescription, roadmapTitle]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    if (!celebration) {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = null;
      }
      return;
    }

    celebrationTimerRef.current = setTimeout(() => {
      setCelebration(null);
    }, 3800);

    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = null;
      }
    };
  }, [celebration]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => clampZoom(prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => clampZoom(prev - ZOOM_STEP));
  }, []);

  const handleFitView = useCallback(() => {
    const viewportEl = canvasViewportRef.current;
    const contentEl = zoomContentRef.current;

    if (!viewportEl || !contentEl || !hasNodes) {
      setZoom(1);
      return;
    }

    const viewportWidth = viewportEl.clientWidth;
    const viewportHeight = viewportEl.clientHeight;
    const contentWidth = contentEl.scrollWidth;
    const contentHeight = contentEl.scrollHeight;

    if (!viewportWidth || !viewportHeight || !contentWidth || !contentHeight) {
      setZoom(1);
      return;
    }

    const padding = 140;
    const widthScale = (viewportWidth - padding) / contentWidth;
    const heightScale = (viewportHeight - padding) / contentHeight;
    const targetZoom = clampZoom(Math.min(widthScale, heightScale) * 0.9);

    setZoom(Number.isFinite(targetZoom) && targetZoom > 0 ? targetZoom : 0.9);

    requestAnimationFrame(() => {
      viewportEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }, [hasNodes]);

  const { addNotification } = useNotification();

  const handleLocateCurrent = useCallback(() => {
    const viewportEl = canvasViewportRef.current;
    const contentEl = zoomContentRef.current;

    if (!viewportEl || !contentEl || !hasNodes) {
      handleFitView();
      return;
    }

    // Find nodes that are in progress
    const inProgressNodes = nodes.filter((n) => {
      const status = String(n.progressState || '').toLowerCase();
      return status === 'inprogress' || status.includes('in_progress') || status.includes('in-progress');
    });

    // If no in-progress nodes, show notification
    if (inProgressNodes.length === 0) {
      addNotification('Không có node nào đang trong trạng thái học', 'info');
      return;
    }

    // Find all DOM elements of in-progress nodes
    const targetElements = inProgressNodes
      .map((node) => {
        // Try to find element by data-node-id or by text content
        return contentEl.querySelector(`[data-node-id="${node.nodeId}"]`) ||
          Array.from(contentEl.querySelectorAll('.skill-tree-roadmap-v2__cell, .course-node'))
            .find((el) => el.textContent?.includes(node.skillName));
      })
      .filter(Boolean);

    if (targetElements.length === 0) {
      handleFitView();
      return;
    }

    // Calculate bounding box of all target elements
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const el of targetElements) {
      const rect = el.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();

      // Transform from viewport to content coordinates (accounting for zoom)
      const relX = (rect.left - contentRect.left) / zoom;
      const relY = (rect.top - contentRect.top) / zoom;
      const relWidth = rect.width / zoom;
      const relHeight = rect.height / zoom;

      minX = Math.min(minX, relX);
      minY = Math.min(minY, relY);
      maxX = Math.max(maxX, relX + relWidth);
      maxY = Math.max(maxY, relY + relHeight);
    }

    const targetWidth = maxX - minX;
    const targetHeight = maxY - minY;
    const targetCenterX = minX + targetWidth / 2;
    const targetCenterY = minY + targetHeight / 2;

    // Calculate zoom to show all in-progress nodes
    const padding = 120;
    const viewportWidth = viewportEl.clientWidth;
    const viewportHeight = viewportEl.clientHeight;
    const availableWidth = Math.max(120, viewportWidth - padding);
    const availableHeight = Math.max(120, viewportHeight - padding);

    const fitScaleX = targetWidth > 0 ? availableWidth / targetWidth : 1;
    const fitScaleY = targetHeight > 0 ? availableHeight / targetHeight : 1;
    const targetZoom = clampZoom(Math.min(1.6, Math.max(0.6, Math.min(fitScaleX, fitScaleY))));

    setZoom(targetZoom);

    // Scroll to center on in-progress nodes
    requestAnimationFrame(() => {
      const scrollX = (targetCenterX * targetZoom) - viewportWidth / 2;
      const scrollY = (targetCenterY * targetZoom) - viewportHeight / 2;

      viewportEl.scrollTo({
        left: Math.max(0, scrollX),
        top: Math.max(0, scrollY),
        behavior: 'smooth'
      });
    });
  }, [nodes, zoom, hasNodes, handleFitView, addNotification]);

  useEffect(() => {
    if (!hasNodes) {
      autoFittedRef.current = false;
      setZoom(1);
      return;
    }

    if (!autoFittedRef.current) {
      autoFittedRef.current = true;
      handleFitView();
    }
  }, [hasNodes, nodes.length, handleFitView]);

  let generationMessage = '';
  if (!hasNodes) {
    if (generationStatus === 'generating' || repersonalizing) {
      generationMessage = 'Roadmap generation is in progress. Please wait a moment...';
    } else if (generationStatus === 'generation_delayed') {
      generationMessage = 'Roadmap generation is taking longer than expected. The system is still processing in the background.';
    } else if (generationStatus === 'preview_ready') {
      generationMessage = 'Roadmap preview is ready. The system is finalizing acceptance...';
    } else if (generationStatus === 'retryable_failed' || isRetryable) {
      generationMessage = 'Previous roadmap generation failed. The system is automatically retrying in the background.';
    } else if (generationStatus === 'empty_accepted') {
      generationMessage = 'Your roadmap is accepted but currently has no actionable nodes.';
    }
  }

  if (loading) {
    return (
      <div className="skill-tree-loading-state">
        <div className="skill-tree-loading-state__inner">
          <div className="skill-tree-spinner"></div>
          <p>Loading Skill Tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skill-tree-loading-state">
        <div className="skill-tree-loading-state__inner">
          <p className="skill-tree-error-title">Error Loading Skill Tree</p>
          <p className="skill-tree-error-message">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skill-tree-page">
      <MilestoneCelebrationModal
        open={!!celebration}
        milestone={celebration?.milestone}
        roadmapTitle={celebration?.roadmapTitle}
        onClose={closeCelebration}
      />
      <div
        className="skill-tree-layout skill-tree-layout--split"
        ref={layoutRef}
        style={{ '--st-panel-ratio': ratio }}
      >
        <main
          ref={canvasViewportRef}
          className="skill-tree-layout__canvas skill-tree-layout__canvas--split"
          aria-label="Skill tree canvas"
        >
          <div className="skill-tree-canvas-stage skill-tree-canvas-stage--scroll">
            {hasNodes ? (
              <div className="skill-tree-zoom-layer" style={{ transform: `scale(${zoom})` }}>
                <div ref={zoomContentRef}>
                  <SkillTreeCanvas
                    nodes={nodes || []}
                    edges={edges || []}
                    onSelectNode={openNode}
                    onToggleNodeStatus={handleRightClickToggle}
                  />
                </div>
              </div>
            ) : (
              <div className="skill-tree-empty-state">
                <p>{generationMessage || 'Roadmap is not available yet.'}</p>
              </div>
            )}
          </div>

          <div className="skill-tree-canvas-controls skill-tree-canvas-controls--split">
            <button
              type="button"
              className="skill-tree-canvas-controls__btn"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              title="Zoom in"
              disabled={!hasNodes}
            >
              +
            </button>
            <button
              type="button"
              className="skill-tree-canvas-controls__btn"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              title="Zoom out"
              disabled={!hasNodes}
            >
              -
            </button>
            <button
              type="button"
              className="skill-tree-canvas-controls__btn"
              onClick={handleFitView}
              aria-label="Fit to view"
              title="Fit to view"
              disabled={!hasNodes}
            >
              ⤢
            </button>
            <button
              type="button"
              className="skill-tree-canvas-controls__btn"
              onClick={handleLocateCurrent}
              aria-label="Locate me"
              title="Locate to current learning position"
              disabled={!hasNodes}
            >
              Locate me
            </button>
          </div>
        </main>

        <div
          className="skill-tree-layout__divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize skill tree canvas and detail panel"
          aria-valuemin={Math.round(minRatio * 100)}
          aria-valuemax={Math.round(maxRatio * 100)}
          aria-valuenow={Math.round(ratio * 100)}
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
        >
          <ManualRoadmapDividerHandle />
        </div>

        <SkillTreeDetailPanel
          title="Chi tiết roadmap"
          subtitle={roadmapTitle}
          tabs={detailTabs}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}
