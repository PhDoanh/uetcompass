import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import * as skillTreeApi from '../../services/skillTree.api';
import { useSkillTree } from './useSkillTree';
import RoadmapGraphRenderer from '../../shared/RoadmapGraphRenderer';
import { useSplitLayout } from './useSplitLayout';
import SkillTreeDetailPanel, { calculateProgress, buildFixedMilestones, SkillTreeOverviewTab, SkillTreeNodeDetailTab } from './SkillTreeDetailPanel';
import MilestoneCelebrationModal from './MilestoneCelebrationModal';
import ManualRoadmapDividerHandle from '../manual-roadmap/ManualRoadmapDividerHandle';
import './skill-tree.css';
import '../manual-roadmap/manual-roadmap.css';

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function isInProgressState(state) {
  const normalizedState = String(state || '').toLowerCase();
  return normalizedState === 'inprogress' || normalizedState === 'in_progress' || normalizedState === 'in-progress';
}

function isCompletedState(state) {
  return String(state || '').toLowerCase() === 'completed';
}

export default function SkillTreePage() {
  const [historyEvents, setHistoryEvents] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const milestoneTriggeredRef = useRef(new Set());
  const previousPercentRef = useRef(0);
  const celebrationInitializedRef = useRef(false);
  const celebrationTimerRef = useRef(null);
  const [focusNodeId, setFocusNodeId] = useState('');

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

  const progressInsights = useMemo(() => {
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    const doneNodes = safeNodes.filter((node) => isCompletedState(node?.progressState)).length;
    const inProgressNodes = safeNodes.filter((node) => isInProgressState(node?.progressState)).length;
    const pendingNodes = Math.max(0, safeNodes.length - doneNodes - inProgressNodes);

    const activityDates = safeNodes
      .filter((node) => isCompletedState(node?.progressState) || isInProgressState(node?.progressState))
      .map((node) => node?.updatedAt)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()));

    const earliestNodeActivity = activityDates.length
      ? new Date(Math.min(...activityDates.map((value) => value.getTime())))
      : null;
    const roadmapCreatedAt = createdAt || acceptedAt || null;
    const earliestLearningDate = earliestNodeActivity || roadmapCreatedAt;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfLearning = earliestLearningDate ? new Date(earliestLearningDate) : null;
    if (startOfLearning) {
      startOfLearning.setHours(0, 0, 0, 0);
    }

    const learnedDays = startOfLearning
      ? Math.max(0, Math.floor((startOfToday - startOfLearning) / (24 * 60 * 60 * 1000)))
      : 0;
    const nodesPerDay = learnedDays > 0 ? inProgressNodes / learnedDays : 0;
    const estimatedCompletionDate = nodesPerDay > 0
      ? addDays(startOfToday, Math.ceil(pendingNodes / nodesPerDay))
      : null;

    return {
      totalNodes: safeNodes.length,
      doneNodes,
      inProgressNodes,
      pendingNodes,
      nodesPerDay,
      startDate: earliestLearningDate,
      estimatedCompletionDate,
      completionRate: progressSummary.percent || 0,
    };
  }, [acceptedAt, createdAt, nodes, progressSummary.percent]);

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

  const graphNodes = useMemo(() => (nodes || []).map((node) => {
    const parentNodeId = String(node?.parentNodeId || '').trim() || null;
    const type = node?.nodeType === 'subtopic' ? 'sub_topic' : 'main_topic';

    return {
      ...node,
      label: node.skillName || node.label || node.nodeId,
      description: node.reason || node.description || '',
      type,
      parentNodeId,
      prerequisites: parentNodeId ? [parentNodeId] : [],
      status: node.progressState || 'pending',
    };
  }), [nodes]);

  const graphEdges = useMemo(() => (edges || [])
    .map((edge) => ({
      edgeId: edge.id || edge.edgeId || `${edge.sourceId || edge.source}->${edge.targetId || edge.target}`,
      source: edge.source || edge.sourceId,
      target: edge.target || edge.targetId,
      type: edge.type || 'default',
    }))
    .filter((edge) => edge.source && edge.target), [edges]);

  const handleNodeTransition = useCallback(async (fromState, toState) => {
    if (!activeNode) {
      return;
    }

    await transitionNode(activeNode.nodeId, fromState, toState);
    await refreshHistory();
  }, [activeNode, refreshHistory, transitionNode]);

  const handleRightClickToggle = useCallback(async (nodeId) => {
    if (!nodeId) {
      return;
    }

    const node = nodes.find((item) => item.nodeId === nodeId);
    if (!node) {
      return;
    }

    const currentState = node.progressState || 'pending';
    const targetState = currentState === 'completed' ? 'pending' : 'completed';

    await transitionNode(node.nodeId, currentState, targetState);
    await refreshHistory();
  }, [nodes, refreshHistory, transitionNode]);

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
          progressStats={progressInsights}
          milestones={milestones}
          progressVariant="fixed"
          historyEvents={historyEvents}
          showHistory
          actions={
            roadmapId ? (
              <button
                type="button"
                className="manual-roadmap-button manual-roadmap-button--secondary"
                onClick={() => { window.location.href = `/manual-roadmap/versions?id=${roadmapId}`; }}
              >
                <Clock size={15} aria-hidden="true" style={{ marginRight: 4 }} />
                Lịch sử phiên bản
              </button>
            ) : null
          }
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search || '');
    const focus = params.get('focus') || '';
    setFocusNodeId(focus);
  }, []);

  useEffect(() => {
    if (!focusNodeId || !hasNodes) {
      return;
    }

    if (nodes.some((node) => node.nodeId === focusNodeId)) {
      openNode(focusNodeId);
    }
  }, [focusNodeId, hasNodes, nodes, openNode]);

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
          className="skill-tree-layout__canvas skill-tree-layout__canvas--split"
          aria-label="Skill tree canvas"
        >
          <div className="skill-tree-canvas-stage skill-tree-graph-shell">
            {hasNodes ? (
              <RoadmapGraphRenderer
                nodes={graphNodes}
                edges={graphEdges}
                onNodeSelect={openNode}
                onNodeToggleStatus={handleRightClickToggle}
                selectedNodeId={activeNodeId}
                controlsVisible
              />
            ) : (
              <div className="skill-tree-empty-state">
                <p>{generationMessage || 'Roadmap is not available yet.'}</p>
              </div>
            )}
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
