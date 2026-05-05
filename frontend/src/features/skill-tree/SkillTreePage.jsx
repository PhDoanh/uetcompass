import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSkillTree } from './useSkillTree';
import SkillTreeCanvas from './SkillTreeCanvas';
import CourseDetailPanel from './CourseDetailPanel';
import './skill-tree.css';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.8;
const ZOOM_STEP = 0.15;

function clampZoom(value) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

export default function SkillTreePage() {
  const [zoom, setZoom] = useState(1);
  const canvasViewportRef = useRef(null);
  const zoomContentRef = useRef(null);
  const autoFittedRef = useRef(false);

  const {
    nodes,
    edges,
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

    const padding = 48;
    const widthScale = (viewportWidth - padding) / contentWidth;
    const heightScale = (viewportHeight - padding) / contentHeight;
    const targetZoom = clampZoom(Math.min(widthScale, heightScale));

    setZoom(Number.isFinite(targetZoom) && targetZoom > 0 ? targetZoom : 1);

    requestAnimationFrame(() => {
      viewportEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }, [hasNodes]);

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
      <div className="skill-tree-layout">
        <main ref={canvasViewportRef} className="skill-tree-layout__canvas" aria-label="Skill tree canvas">
          <section className="skill-tree-summary-card" aria-label="Roadmap summary">
            <h2 className="skill-tree-summary-card__title">Your personalized roadmap</h2>
            <p className="skill-tree-summary-card__meta">Created at: {roadmapCreatedLabel}</p>
          </section>

          {hasNodes ? (
            <div className="skill-tree-zoom-layer" style={{ transform: `scale(${zoom})` }}>
              <div ref={zoomContentRef}>
                <SkillTreeCanvas
                  nodes={nodes || []}
                  edges={edges || []}
                  onSelectNode={openNode}
                />
              </div>
            </div>
          ) : (
            <div className="skill-tree-empty-state">
              <p>{generationMessage || 'Roadmap is not available yet.'}</p>
            </div>
          )}
        </main>

        <div className="skill-tree-canvas-controls">
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
        </div>

        {activeNode && (
          <CourseDetailPanel
            node={activeNode}
            roadmapId={roadmapId}
            onClosePanel={closeNode}
            onTransition={(fromState, toState) => transitionNode(activeNode.nodeId, fromState, toState)}
          />
        )}
      </div>

      <footer className="skill-tree-page__footer">
        <span>UETCompass</span>
      </footer>
    </div>
  );
}
