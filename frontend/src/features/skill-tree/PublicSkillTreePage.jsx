import React, { useCallback, useEffect, useMemo, useState } from 'react';
import RoadmapGraphRenderer from '../../shared/RoadmapGraphRenderer';
import { computeLayoutSafe } from '../../shared/elkLayoutEngine';
import { useAuth } from '../../providers/AuthProvider';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import { useNotification } from '../notification/NotificationContainer';
import { patchNodeStatus, getRoadmapProgress } from '../../services/skillTree.api';
import { Copy } from 'lucide-react';
import './skill-tree.css';
import { useSplitLayout } from './useSplitLayout';
import ReviewTab from './ReviewTab';
import ManualRoadmapDividerHandle from '../manual-roadmap/ManualRoadmapDividerHandle';
import SkillTreeDetailPanel, {
  SkillTreeOverviewTab,
  SkillTreeNodeDetailTab,
  calculateProgress,
} from './SkillTreeDetailPanel';

const ROADMAP_EDITOR_PREFILL_STORAGE_KEY = 'manualRoadmap.editorPrefill';
const YAML_MAX_LENGTH = 10 * 1024;

function normalizeNodeState(state) {
  const normalized = String(state || '').trim();
  if (normalized === 'in_progress') return 'inProgress';
  if (normalized === 'done') return 'completed';
  if (normalized === 'locked') return 'skip';
  if (normalized === 'inProgress' || normalized === 'completed' || normalized === 'skip' || normalized === 'pending') {
    return normalized;
  }
  return 'pending';
}

function normalizePreviewNodes(nodes = []) {
  const seenIds = new Set();
  const mappedNodes = nodes
    .map((node) => {
      const nodeId = String(node?.nodeId || node?.id || '').trim();
      if (!nodeId || seenIds.has(nodeId)) {
        return null;
      }
      seenIds.add(nodeId);

      const metadata = typeof node?.metadata === 'object' && node?.metadata !== null ? node.metadata : {};
      const parentNodeId = String(
        node?.parent || metadata?.parentNodeId || node?.parentNodeId || ''
      ).trim();
      const prerequisites = Array.isArray(node?.prerequisites)
        ? node.prerequisites.map((id) => String(id || '').trim()).filter(Boolean)
        : (parentNodeId ? [parentNodeId] : []);
      const rawType = String(node?.type || '').trim();
      const type = parentNodeId
        ? (rawType === 'choice_item' ? 'choice_item' : 'sub_topic')
        : (rawType || 'main_topic');

      return {
        nodeId,
        label: String(node?.label || node?.skillName || nodeId).trim(),
        description: String(node?.description || node?.reason || '').trim(),
        parent: parentNodeId || undefined,
        parentNodeId: parentNodeId || undefined,
        type,
        prerequisites,
        status: String(node?.status || 'pending').trim() || 'pending',
        resources: Array.isArray(node?.resources) ? node.resources : [],
        metadata,
      };
    })
    .filter(Boolean);

  const nodeIdSet = new Set(mappedNodes.map((node) => node.nodeId));
  const rootNodes = [];
  const childNodes = [];

  mappedNodes.forEach((node) => {
    if (node.parent && nodeIdSet.has(node.parent)) {
      childNodes.push(node);
      return;
    }

    rootNodes.push({
      ...node,
      parent: undefined,
      parentNodeId: undefined,
      prerequisites: Array.isArray(node.prerequisites)
        ? node.prerequisites.filter((id) => id && nodeIdSet.has(id))
        : [],
    });
  });

  return [...rootNodes, ...childNodes];
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function buildPublicSkillTreeHref(roadmapId) {
  const normalizedRoadmapId = encodeURIComponent(String(roadmapId || '').trim());
  return normalizedRoadmapId ? `/skill-tree/${normalizedRoadmapId}` : '/skill-tree';
}

function isManualRoadmapShared(roadmap) {
  return Boolean(roadmap?.shared || roadmap?.isPublic || roadmap?.sharedAt || roadmap?.status === 'published');
}

export default function PublicSkillTreePage({ roadmapId = '' }) {
  const { isAuthenticated, accessToken } = useAuth();
  const { addNotification } = useNotification();
  const [previewStatus, setPreviewStatus] = useState('loading');
  const [previewData, setPreviewData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [layoutPositions, setLayoutPositions] = useState({});
  const [isComputingLayout, setIsComputingLayout] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState('');
  const [nodeStates, setNodeStates] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [focusNodeId, setFocusNodeId] = useState('');
  const [isTogglingShare, setIsTogglingShare] = useState(false);
  const [isCopyingShareLink, setIsCopyingShareLink] = useState(false);

  const normalizedNodes = useMemo(() => normalizePreviewNodes(previewData?.nodes || []), [previewData]);
  const previewEdges = useMemo(() => (Array.isArray(previewData?.edges) ? previewData.edges : []), [previewData]);
  const nodesForRender = useMemo(
    () => normalizedNodes.map((node) => ({
      ...node,
      status: nodeStates[node.nodeId] || normalizeNodeState(node.status),
    })),
    [normalizedNodes, nodeStates]
  );
  const activeNode = useMemo(
    () => nodesForRender.find((node) => node.nodeId === activeNodeId) || null,
    [activeNodeId, nodesForRender]
  );
  const normalizedRoadmapId = useMemo(() => String(roadmapId || '').trim(), [roadmapId]);
  const isOwner = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mine') === '1';

  // Fire any cross-page notification stored before navigation (e.g. after revert)
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('skillTree.pendingNotification');
      if (raw) {
        window.sessionStorage.removeItem('skillTree.pendingNotification');
        const { message, type } = JSON.parse(raw);
        if (message) addNotification(message, type || 'success');
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  useEffect(() => {
    if (activeNode) {
      setActiveTab('node');
      return;
    }

    setActiveTab('overview');
  }, [activeNode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search || '');
    const focus = params.get('focus') || '';
    setFocusNodeId(focus);
  }, []);

  const {
    layoutRef,
    ratio,
    minRatio,
    maxRatio,
    handleResizePointerDown,
    handleResizeKeyDown,
  } = useSplitLayout();

  const progressSummary = useMemo(
    () => calculateProgress(nodesForRender, (node) => node.status),
    [nodesForRender]
  );

  const progressStats = useMemo(() => {
    const totalNodes = nodesForRender.length;
    const doneNodes = nodesForRender.filter((node) => node.status === 'completed').length;
    const inProgressNodes = nodesForRender.filter((node) => node.status === 'inProgress').length;
    const pendingNodes = Math.max(0, totalNodes - doneNodes - inProgressNodes);
    const startDate = previewData?.sharedAt || previewData?.createdAt || null;

    const start = startDate ? new Date(startDate) : null;
    if (start) {
      start.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const learnedDays = start
      ? Math.max(0, Math.floor((today - start) / (24 * 60 * 60 * 1000)))
      : 0;
    const nodesPerDay = learnedDays > 0 ? inProgressNodes / learnedDays : 0;
    const estimatedCompletionDate = nodesPerDay > 0
      ? addDays(today, Math.ceil(pendingNodes / nodesPerDay))
      : null;

    return {
      totalNodes,
      doneNodes,
      inProgressNodes,
      pendingNodes,
      nodesPerDay,
      startDate,
      estimatedCompletionDate,
    };
  }, [nodesForRender, previewData]);

  const sharedAtLabel = previewData?.sharedAt
    ? new Date(previewData.sharedAt).toLocaleString()
    : 'Chưa có';

  const isShared = useMemo(
    () => isManualRoadmapShared(previewData),
    [previewData]
  );

  const handleToggleShareRoadmap = useCallback(async () => {
    if (!accessToken || !normalizedRoadmapId || isTogglingShare) {
      return;
    }

    setIsTogglingShare(true);

    try {
      if (isShared) {
        await manualRoadmapApi.unshareManualRoadmap(accessToken, normalizedRoadmapId);
        setPreviewData((current) => ({
          ...(current || {}),
          shared: false,
          isPublic: false,
          status: 'draft',
          sharedAt: null,
        }));
        addNotification('Đã tắt chia sẻ cho manual roadmap.', 'success');
      } else {
        const updatedRoadmap = await manualRoadmapApi.shareManualRoadmap(accessToken, normalizedRoadmapId);
        setPreviewData((current) => ({
          ...(current || {}),
          ...(updatedRoadmap || {}),
          shared: true,
          isPublic: true,
          status: 'published',
          sharedAt: updatedRoadmap?.sharedAt || current?.sharedAt || new Date().toISOString(),
        }));
        addNotification('Đã bật chia sẻ cho manual roadmap.', 'success');
      }
    } catch (error) {
      if (error?.status === 401) {
        await window.location.assign('/login');
        return;
      }

      addNotification(error?.message || 'Không thể thay đổi trạng thái chia sẻ cho roadmap này.', 'error');
    } finally {
      setIsTogglingShare(false);
    }
  }, [accessToken, addNotification, isShared, isTogglingShare, normalizedRoadmapId]);

  const handleCopyShareLink = useCallback(async () => {
    if (!isShared || typeof window === 'undefined') {
      return;
    }

    const shareUrl = `${window.location.origin}${buildPublicSkillTreeHref(normalizedRoadmapId)}`;
    setIsCopyingShareLink(true);

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

      addNotification('Đã sao chép link manual roadmap.', 'success');
    } catch (error) {
      addNotification(error?.message || 'Không thể sao chép link lúc này.', 'error');
    } finally {
      setIsCopyingShareLink(false);
    }
  }, [addNotification, isShared, normalizedRoadmapId]);

  const overviewMetaItems = useMemo(() => ([
    { label: 'Ngày chia sẻ', value: sharedAtLabel },
    { label: 'Số node', value: nodesForRender.length ? `${nodesForRender.length}` : '0' },
  ]), [sharedAtLabel, nodesForRender.length]);

  const headerActions = (
    <div className="homepage-roadmap-card__share skill-tree-panel__share">
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
          aria-label="Chia sẻ roadmap"
          className={`homepage-roadmap-share-toggle${isShared ? ' is-on' : ''}`}
          onClick={handleToggleShareRoadmap}
          aria-busy={isTogglingShare}
          disabled={!accessToken}
        >
          <span className="homepage-roadmap-share-toggle__thumb" />
        </button>
      </div>

      {isShared ? (
        <button
          type="button"
          className="homepage-roadmap-share-copy"
          onClick={handleCopyShareLink}
          disabled={isCopyingShareLink}
        >
          <Copy size={14} aria-hidden="true" />
          <span>{isCopyingShareLink ? 'Đang sao chép...' : 'Sao chép link'}</span>
        </button>
      ) : null}
    </div>
  );

  const overviewActions = (
    <>
      <button
        type="button"
        className="skill-tree-edit-button"
        onClick={handleOpenInEditor}
      >
        Chỉnh sửa Roadmap
      </button>
      {isOwner && (
        <button
          type="button"
          className="skill-tree-back-button"
          onClick={() => window.location.assign(`/manual-roadmap/versions?id=${encodeURIComponent(normalizedRoadmapId)}`)}
        >
          Lịch sử
        </button>
      )}
      <button
        type="button"
        className="skill-tree-back-button"
        onClick={handleBack}
      >
        Quay lại
      </button>
    </>
  );

  const handleNodeTransition = useCallback(async (node, toState) => {
    if (!node?.nodeId) {
      return;
    }

    const fromState = nodeStates[node.nodeId] || normalizeNodeState(node.status);
    if (!toState || toState === fromState) {
      return;
    }

    setNodeStates((prev) => ({
      ...prev,
      [node.nodeId]: toState,
    }));

    if (isOwner && accessToken) {
      try {
        await patchNodeStatus(accessToken, normalizedRoadmapId, node.nodeId, fromState, toState);
      } catch (error) {
        setNodeStates((prev) => ({ ...prev, [node.nodeId]: fromState }));
        addNotification(error?.message || 'Không thể lưu tiến độ.', 'error');
      }
    }
  }, [accessToken, addNotification, isOwner, nodeStates, normalizedRoadmapId]);

  const handleRightClickToggle = useCallback((nodeId) => {
    const target = nodesForRender.find((node) => node.nodeId === nodeId);
    if (!target) {
      return;
    }
    const current = nodeStates[nodeId] || normalizeNodeState(target.status);
    const next = current === 'completed' ? 'pending' : 'completed';
    handleNodeTransition(target, next);
  }, [handleNodeTransition, nodeStates, nodesForRender]);

  const detailTabs = useMemo(() => ([
    {
      id: 'overview',
      label: 'Tổng quan',
      content: (
        <SkillTreeOverviewTab
          title={previewData?.title || 'Roadmap'}
          description={previewData?.description || 'Chưa có mô tả.'}
          metaItems={overviewMetaItems}
          progress={progressSummary}
          progressStats={progressStats}
          actions={overviewActions}
        />
      ),
    },
    {
      id: 'node',
      label: 'Chi tiết nút',
      disabled: !activeNode,
      content: (
        <SkillTreeNodeDetailTab
          mode="public"
          node={activeNode}
          onClearSelection={() => setActiveNodeId('')}
          onTransition={activeNode
            ? (_, toState) => handleNodeTransition(activeNode, toState)
            : undefined}
        />
      ),
    },
    {
      id: 'reviews',
      label: 'Nhận xét',
      content: (
        <ReviewTab roadmapId={roadmapId} />
      ),
    },
  ]), [activeNode, handleNodeTransition, overviewActions, overviewMetaItems, previewData, roadmapId]);

  function handleBack() {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign('/');
  }

  function handleOpenInEditor() {
    if (!isAuthenticated) {
      addNotification('Vui lòng đăng nhập để chỉnh sửa roadmap.', 'warning');
      return;
    }

    if (isOwner) {
      window.location.assign(`/manual-roadmap?id=${encodeURIComponent(normalizedRoadmapId)}`);
      return;
    }

    const yamlCode = typeof previewData?.yamlCode === 'string' ? previewData.yamlCode : '';

    if (!yamlCode.trim() || yamlCode.length > YAML_MAX_LENGTH) {
      addNotification('Yaml code không khả dụng.', 'error');
      return;
    }

    try {
      window.sessionStorage.setItem(
        ROADMAP_EDITOR_PREFILL_STORAGE_KEY,
        JSON.stringify({ yamlCode, sourceRoadmapId: roadmapId, savedAt: Date.now() })
      );
    } catch {
      addNotification('Không thể tải nội dung YAML vào editor.', 'error');
      return;
    }

    window.location.assign('/manual-roadmap');
  }

  useEffect(() => {
    if (!normalizedRoadmapId) {
      setPreviewStatus('error');
      setErrorMessage('Roadmap ID is missing.');
      setPreviewData(null);
      return;
    }

    let isActive = true;
    setPreviewStatus('loading');
    setErrorMessage('');

    (async () => {
      try {
        const payload = await manualRoadmapApi.getPublicManualRoadmapPreviewById(normalizedRoadmapId);
        if (!isActive) {
          return;
        }

        setPreviewData(payload);
        setPreviewStatus('loaded');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPreviewData(null);
        setPreviewStatus('error');
        setErrorMessage(error?.message || 'Unable to load roadmap preview.');
      }
    })();

    return () => {
      isActive = false;
    };
  }, [roadmapId]);

  useEffect(() => {
    if (normalizedNodes.length === 0) {
      setNodeStates({});
      setActiveNodeId('');
      return;
    }

    const initialStates = {};
    normalizedNodes.forEach((node) => {
      initialStates[node.nodeId] = normalizeNodeState(node.status);
    });

    setNodeStates(initialStates);
    setActiveNodeId('');
  }, [normalizedNodes]);

  useEffect(() => {
    if (!isOwner || !accessToken || !normalizedRoadmapId || normalizedNodes.length === 0) {
      return;
    }

    let isActive = true;

    (async () => {
      try {
        const progress = await getRoadmapProgress(accessToken, normalizedRoadmapId);
        if (!isActive || !progress?.state) {
          return;
        }

        const { pending = [], inProgress = [], completed = [], skip = [] } = progress.state;
        const progressMap = {};
        pending.forEach((id) => { progressMap[id] = 'pending'; });
        inProgress.forEach((id) => { progressMap[id] = 'inProgress'; });
        completed.forEach((id) => { progressMap[id] = 'completed'; });
        skip.forEach((id) => { progressMap[id] = 'skip'; });

        setNodeStates((prev) => {
          const next = { ...prev };
          Object.keys(progressMap).forEach((id) => {
            if (id in next) {
              next[id] = progressMap[id];
            }
          });
          return next;
        });
      } catch {
        // Progress load failed, keep defaults
      }
    })();

    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, accessToken, normalizedRoadmapId, normalizedNodes]);

  useEffect(() => {
    if (!focusNodeId || normalizedNodes.length === 0) {
      return;
    }

    const targetExists = normalizedNodes.some((node) => node.nodeId === focusNodeId);
    if (targetExists) {
      setActiveNodeId(focusNodeId);
    }
  }, [focusNodeId, normalizedNodes]);

  useEffect(() => {
    if (normalizedNodes.length === 0) {
      setLayoutPositions({});
      setIsComputingLayout(false);
      return;
    }

    let isMounted = true;
    setIsComputingLayout(true);

    (async () => {
      try {
        const positions = await computeLayoutSafe(
          normalizedNodes,
          previewEdges,
          { direction: 'RIGHT', nodeSpacing: 40, rankSpacing: 80 },
          true
        );

        if (isMounted) {
          setLayoutPositions(positions);
        }
      } catch {
        if (isMounted) {
          setLayoutPositions({});
        }
      } finally {
        if (isMounted) {
          setIsComputingLayout(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [normalizedNodes, previewEdges]);

  if (previewStatus === 'loading') {
    return (
      <main style={{ width: '100%', minHeight: 'calc(100vh - 70px)', display: 'grid', placeItems: 'center' }}>
        <p>Loading roadmap...</p>
      </main>
    );
  }

  if (previewStatus === 'error') {
    return (
      <main style={{ width: '100%', minHeight: 'calc(100vh - 70px)', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '680px', textAlign: 'center' }}>
          <h2>Cannot load roadmap</h2>
          <p>{errorMessage || 'Unable to load roadmap preview.'}</p>
          <a href="/" className="homepage-wire-btn homepage-wire-btn--white">Back to homepage</a>
        </div>
      </main>
    );
  }

  return (
    <div className="skill-tree-page">
      <div
        className="skill-tree-layout skill-tree-layout--split"
        ref={layoutRef}
        style={{ '--st-panel-ratio': ratio }}
      >
        <main
          className="skill-tree-layout__canvas skill-tree-layout__canvas--split"
          aria-label="Public skill tree canvas"
        >
          <div className="skill-tree-canvas-stage skill-tree-graph-shell">
            {normalizedNodes.length > 0 ? (
              <RoadmapGraphRenderer
                nodes={nodesForRender}
                edges={previewEdges}
                positions={layoutPositions}
                onNodeSelect={setActiveNodeId}
                onNodeToggleStatus={handleRightClickToggle}
                selectedNodeId={activeNodeId}
                loading={isComputingLayout}
                controlsVisible
              />
            ) : (
              <div className="skill-tree-empty-state">
                <p>No nodes to preview yet.</p>
              </div>
            )}
          </div>
        </main>

        <div
          className="skill-tree-layout__divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize roadmap canvas and detail panel"
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
          subtitle={previewData?.title || 'Roadmap'}
          tabs={detailTabs}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
          headerActions={headerActions}
        />
      </div>
    </div>
  );
}
