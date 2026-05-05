import React, { useEffect, useMemo, useState } from 'react';
import RoadmapGraphRenderer from '../../shared/RoadmapGraphRenderer';
import { computeLayoutSafe } from '../../shared/elkLayoutEngine';
import { useAuth } from '../../providers/AuthProvider';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import PublicRoadmapNodePanel from './PublicRoadmapNodePanel';
import { useNotification } from '../notification/NotificationContainer';
import { navigateTo } from '../../shared/navigation';
import './skill-tree.css';

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
  const mappedNodes = nodes
    .map((node) => {
      const nodeId = String(node?.nodeId || node?.id || '').trim();
      if (!nodeId) {
        return null;
      }

      const metadata = typeof node?.metadata === 'object' && node?.metadata !== null ? node.metadata : {};
      const parentNodeId = String(
        node?.parent || metadata?.parentNodeId || node?.parentNodeId || ''
      ).trim();
      const prerequisites = Array.isArray(node?.prerequisites)
        ? node.prerequisites.map((id) => String(id || '').trim()).filter(Boolean)
        : (parentNodeId ? [parentNodeId] : []);

      return {
        nodeId,
        label: String(node?.label || node?.skillName || nodeId).trim(),
        description: String(node?.description || node?.reason || '').trim(),
        parent: parentNodeId || undefined,
        parentNodeId: parentNodeId || undefined,
        type: String(node?.type || '').trim() || (parentNodeId ? 'sub_topic' : 'main_topic'),
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

export default function PublicSkillTreePage({ roadmapId = '' }) {
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();
  const [previewStatus, setPreviewStatus] = useState('loading');
  const [previewData, setPreviewData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [layoutPositions, setLayoutPositions] = useState({});
  const [isComputingLayout, setIsComputingLayout] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState('');
  const [nodeStates, setNodeStates] = useState({});

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

  const handleBack = () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    navigateTo('/');
  };

  const handleOpenInEditor = () => {
    if (!isAuthenticated) {
      addNotification('Vui lòng đăng nhập để chỉnh sửa roadmap.', 'warning');
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

    navigateTo('/manual-roadmap');
  };

  useEffect(() => {
    const normalizedRoadmapId = String(roadmapId || '').trim();
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
      <div className="skill-tree-layout">
        <main className="skill-tree-layout__canvas" aria-label="Public skill tree canvas">
          <section className="skill-tree-summary-card" aria-label="Roadmap summary">
            <div className="skill-tree-summary-card__top-row">
              <h2 className="skill-tree-summary-card__title">{previewData?.title || 'Roadmap'}</h2>
              <div className="skill-tree-summary-card__actions">
                <button
                  type="button"
                  className="skill-tree-edit-button"
                  onClick={handleOpenInEditor}
                >
                  Chỉnh sửa Roadmap
                </button>
                <button type="button" className="skill-tree-back-button" onClick={handleBack}>Quay lại</button>
              </div>
            </div>
            <p className="skill-tree-summary-card__meta">{previewData?.description || 'No description available.'}</p>
          </section>

          {normalizedNodes.length > 0 ? (
            <div style={{ height: 'calc(100vh - 220px)' }}>
              <RoadmapGraphRenderer
                nodes={nodesForRender}
                edges={previewEdges}
                positions={layoutPositions}
                onNodeSelect={setActiveNodeId}
                selectedNodeId={activeNodeId}
                loading={isComputingLayout}
                controlsVisible
              />
            </div>
          ) : (
            <div className="skill-tree-empty-state">
              <p>No nodes to preview yet.</p>
            </div>
          )}
        </main>

        {activeNode ? (
          <PublicRoadmapNodePanel
            node={activeNode}
            onClosePanel={() => setActiveNodeId('')}
            onTransition={async (_, toState) => {
              setNodeStates((prev) => ({
                ...prev,
                [activeNode.nodeId]: toState,
              }));
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
