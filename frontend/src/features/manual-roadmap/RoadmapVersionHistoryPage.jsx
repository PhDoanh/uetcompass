import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import manualRoadmapApi from './manualRoadmap.api';
import { parseManualRoadmapYaml } from './manualRoadmap.validation';
import RoadmapGraphRenderer from '../../shared/RoadmapGraphRenderer';
import { computeLayoutSafe } from '../../shared/elkLayoutEngine';
import ManualRoadmapDividerHandle from './ManualRoadmapDividerHandle';
import '../skill-tree/skill-tree.css';
import './manual-roadmap.css';
import './roadmapVersionHistory.css';

function parseQueryParam(name) {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(value) {
  if (!value) return '--';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '--' : d.toLocaleString('vi-VN');
}

export default function RoadmapVersionHistoryPage() {
  const { accessToken } = useAuth();
  const roadmapId = parseQueryParam('id');

  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [revertingVersionId, setRevertingVersionId] = useState(null);

  const [preview, setPreview] = useState({ nodes: [], edges: [] });
  const [layoutPositions, setLayoutPositions] = useState({});
  const [isComputingLayout, setIsComputingLayout] = useState(false);

  const layoutRef = useRef(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const DIVIDER_WIDTH = 14;
  const MIN_SIDEBAR = 180;
  const MAX_SIDEBAR = 520;
  const dragRef = useRef({ startX: 0, startWidth: 300 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const el = layoutRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setLayoutWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleResizePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    setIsDragging(true);
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDragging || typeof window === 'undefined') return undefined;
    const savedCursor = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (e) => {
      const delta = e.clientX - dragRef.current.startX;
      const next = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, dragRef.current.startWidth + delta));
      setSidebarWidth(next);
    };
    const onEnd = () => setIsDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      document.body.style.cursor = savedCursor;
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!roadmapId || !accessToken) return undefined;

    let cancelled = false;
    setIsLoading(true);
    setError('');

    manualRoadmapApi
      .listRoadmapVersions(accessToken, roadmapId)
      .then(({ items }) => {
        if (!cancelled) {
          setVersions(Array.isArray(items) ? items : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Không thể tải danh sách phiên bản.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [roadmapId, accessToken]);

  const handleSelectVersion = useCallback(
    async (versionId) => {
      if (!roadmapId || !accessToken) return;
      setIsLoadingDetail(true);
      setError('');
      try {
        const version = await manualRoadmapApi.getRoadmapVersion(accessToken, roadmapId, versionId);
        setSelectedVersion(version);
      } catch (err) {
        setError(err.message || 'Không thể tải nội dung phiên bản.');
        setIsLoadingDetail(false);
      }
    },
    [roadmapId, accessToken]
  );

  // Parse YAML whenever selected version changes
  useEffect(() => {
    if (!selectedVersion?.yamlCode) {
      setPreview({ nodes: [], edges: [] });
      setLayoutPositions({});
      setIsLoadingDetail(false);
      return;
    }
    try {
      const parsed = parseManualRoadmapYaml(selectedVersion.yamlCode);
      setPreview(parsed);
    } catch {
      setPreview({ nodes: [], edges: [] });
    }
    setIsLoadingDetail(false);
  }, [selectedVersion]);

  // Compute ELK layout whenever preview changes
  useEffect(() => {
    if (!preview.nodes.length) {
      setLayoutPositions({});
      return undefined;
    }

    let isMounted = true;
    setIsComputingLayout(true);

    (async () => {
      try {
        const positions = await computeLayoutSafe(
          preview.nodes,
          preview.edges,
          { direction: 'RIGHT', nodeSpacing: 40, rankSpacing: 80 },
          true
        );
        if (isMounted) setLayoutPositions(positions);
      } catch {
        if (isMounted) setLayoutPositions({});
      } finally {
        if (isMounted) setIsComputingLayout(false);
      }
    })();

    return () => { isMounted = false; };
  }, [preview.nodes, preview.edges]);

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const backUrl = roadmapId ? `/skill-tree/${roadmapId}?mine=1` : '/';
      window.location.href = backUrl;
    }
  };

  const handleRevert = useCallback(
    async (versionId) => {
      if (!roadmapId || !accessToken) return;
      setRevertingVersionId(versionId);
      setError('');
      try {
        await manualRoadmapApi.revertRoadmapVersion(accessToken, roadmapId, versionId);
        try {
          window.sessionStorage.setItem('skillTree.pendingNotification', JSON.stringify({
            message: 'Khôi phục phiên bản thành công.',
            type: 'success',
          }));
        } catch {
          // Ignore sessionStorage errors
        }
        window.location.href = `/skill-tree/${encodeURIComponent(roadmapId)}?mine=1`;
      } catch (err) {
        setError(err.message || 'Không thể khôi phục phiên bản.');
        setRevertingVersionId(null);
      }
    },
    [roadmapId, accessToken]
  );

  const canvasWidth = layoutWidth > 0 ? Math.max(0, layoutWidth - sidebarWidth - DIVIDER_WIDTH) : 0;

  return (
    <div className="skill-tree-page manual-roadmap-page">
      <div className="skill-tree-layout manual-roadmap-layout" ref={layoutRef}>

        {/* Left pane: version list */}
        <aside
          className="skill-tree-panel manual-roadmap-panel roadmap-version-sidebar"
          aria-label="Danh sách phiên bản"
          style={layoutWidth > 0 ? { flexBasis: `${sidebarWidth}px`, width: `${sidebarWidth}px` } : undefined}
        >
          <div className="roadmap-version-list-pane">
            <div className="roadmap-version-list-pane__header">
              <button
                type="button"
                onClick={handleBack}
                className="manual-roadmap-button manual-roadmap-button--secondary"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Quay lại
              </button>
              <h1 className="roadmap-version-list-pane__title">Lịch sử phiên bản</h1>
            </div>

            {error && (
              <div className="manual-roadmap-alert manual-roadmap-alert--error">{error}</div>
            )}

            {isLoading ? (
              <p className="skill-tree-muted-text">Đang tải...</p>
            ) : versions.length === 0 ? (
              <p className="skill-tree-muted-text">Chưa có phiên bản nào được lưu.</p>
            ) : (
              <ol className="roadmap-version-list">
                {versions.map((v, index) => (
                  <li
                    key={v._id}
                    className={`roadmap-version-list__item${selectedVersion?._id === v._id ? ' roadmap-version-list__item--active' : ''}`}
                    onClick={() => handleSelectVersion(v._id)}
                  >
                    <span className="roadmap-version-list__number">
                      Phiên bản {versions.length - index}
                    </span>
                    <span className="roadmap-version-list__date">
                      {formatDate(v.updatedAt)}
                    </span>
                    {selectedVersion?._id === v._id && (
                      <button
                        type="button"
                        className="manual-roadmap-button manual-roadmap-button--secondary"
                        style={{ marginTop: '6px', fontSize: '12px', padding: '2px 8px' }}
                        disabled={revertingVersionId === v._id}
                        onClick={(e) => { e.stopPropagation(); handleRevert(v._id); }}
                      >
                        {revertingVersionId === v._id ? 'Đang khôi phục...' : 'Khôi phục'}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>

        <div
          className="manual-roadmap-layout__divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Thay đổi kích thước"
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
        >
          <ManualRoadmapDividerHandle />
        </div>

        {/* Right pane: roadmap graph canvas */}
        <main
          className="skill-tree-layout__canvas manual-roadmap-layout__canvas"
          aria-label="Roadmap preview"
          style={layoutWidth > 0 ? { flexBasis: `${canvasWidth}px`, width: `${canvasWidth}px` } : undefined}
        >
          {isLoadingDetail ? (
            <div className="skill-tree-loading-state">
              <div className="skill-tree-loading-state__inner">
                <div className="skill-tree-spinner" />
                <p>Đang tải phiên bản...</p>
              </div>
            </div>
          ) : preview.nodes.length > 0 ? (
            <RoadmapGraphRenderer
              nodes={preview.nodes}
              edges={preview.edges}
              positions={layoutPositions}
              loading={isComputingLayout}
            />
          ) : (
            <div className="skill-tree-empty-state">
              <p>{selectedVersion ? 'Không thể render roadmap từ phiên bản này.' : 'Chọn một phiên bản để xem roadmap.'}</p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
