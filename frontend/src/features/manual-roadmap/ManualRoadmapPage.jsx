import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import Editor from '@monaco-editor/react';
import { dump, load } from 'js-yaml';
import manualRoadmapApi from './manualRoadmap.api';
import { parseManualRoadmapYaml } from './manualRoadmap.validation';
import RoadmapGraphRenderer from '../../shared/RoadmapGraphRenderer';
import { computeLayoutSafe } from '../../shared/elkLayoutEngine';
import ManualRoadmapDividerHandle from './ManualRoadmapDividerHandle';
import YamlGuideOverlay from './YamlGuideOverlay';
import { useNotification } from '../general/NotificationContainer';
import { CircleHelp, History, Save } from 'lucide-react';
import '../skill-tree/skill-tree.css';
import './manual-roadmap.css';
import webDevelopmentSample from '../../../../specs/013-manual-roadmap-generator/sample-manual-roadmap.yaml?raw';
import dataAnalyticsSample from '../../../../specs/013-manual-roadmap-generator/sample-data-analytics-roadmap.yaml?raw';
import cloudDevopsSample from '../../../../specs/013-manual-roadmap-generator/sample-cloud-devops-roadmap.yaml?raw';
import cybersecuritySample from '../../../../specs/013-manual-roadmap-generator/sample-cybersecurity-roadmap.yaml?raw';
import fullstackExtendedSample from '../../../../specs/013-manual-roadmap-generator/sample-fullstack-engineering-extended-roadmap.yaml?raw';
import renderShowcaseSample from '../../../../specs/013-manual-roadmap-generator/sample-render-showcase-roadmap.yaml?raw';

const SAMPLE_ROADMAPS = [
  {
    key: 'web-development',
    label: 'Web Development Basics',
    description: 'Frontend fundamentals with HTML, CSS, JavaScript, HTTP, and browser tools.',
    yaml: webDevelopmentSample,
  },
  {
    key: 'data-analytics',
    label: 'Data Analytics Starter',
    description: 'Spreadsheets, SQL, visualization, and analytics storytelling.',
    yaml: dataAnalyticsSample,
  },
  {
    key: 'cloud-devops',
    label: 'Cloud DevOps Path',
    description: 'Cloud basics, CI/CD, containers, observability, and deployment.',
    yaml: cloudDevopsSample,
  },
  {
    key: 'cybersecurity',
    label: 'Cybersecurity Foundations',
    description: 'Security basics, networking, web security, and incident response.',
    yaml: cybersecuritySample,
  },
  {
    key: 'fullstack-extended',
    label: 'Fullstack Engineering Extended',
    description: 'A larger sample roadmap with frontend, backend, data, testing, and deployment stages.',
    yaml: fullstackExtendedSample,
  },
  {
    key: 'render-showcase',
    label: 'Render Showcase (All Node Types)',
    description: 'Purpose-built sample covering main/sub/group/choice nodes, prerequisites, and explicit edges.',
    yaml: renderShowcaseSample,
  },
];

const MANUAL_ROADMAP_SPLIT_DEFAULT_RATIO = 0.32;
const MANUAL_ROADMAP_SPLIT_MIN_RATIO = 0.2;
const MANUAL_ROADMAP_SPLIT_MAX_RATIO = 0.8;
const MANUAL_ROADMAP_RESIZER_WIDTH = 14;
const MANUAL_ROADMAP_PREFILL_STORAGE_KEY = 'manualRoadmap.editorPrefill';

function resolveMonacoTheme() {
  if (typeof document === 'undefined') {
    return 'vs-light';
  }

  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs-light';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseQueryParam(name) {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findNodeLine(yamlText, nodeId) {
  if (!yamlText || !nodeId) return 0;
  const lines = String(yamlText).split('\n');
  const escapedId = escapeRegExp(nodeId);
  const nodeIdPattern = new RegExp(`^\\s*-\\s*nodeId:\\s*['\"]?${escapedId}['\"]?\\s*$`);
  const idPattern = new RegExp(`^\\s*-\\s*id:\\s*['\"]?${escapedId}['\"]?\\s*$`);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (nodeIdPattern.test(line) || idPattern.test(line)) {
      return index + 1;
    }
  }
  return 0;
}

function normalizeYamlForPersistence(yamlText) {
  const parsed = load(yamlText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('YAML phải là một đối tượng trước khi lưu.');
  }

  const next = { ...parsed };
  const rawNodes = Array.isArray(next.nodes) ? next.nodes : [];

  next.nodes = rawNodes.map((node) => {
    if (!node || typeof node !== 'object') {
      return node;
    }

    const normalizedNode = { ...node };
    const parentNodeId = String(normalizedNode.parent || '').trim();

    if (parentNodeId) {
      const metadata = typeof normalizedNode.metadata === 'object' && normalizedNode.metadata !== null && !Array.isArray(normalizedNode.metadata)
        ? { ...normalizedNode.metadata }
        : {};

      if (!String(metadata.parentNodeId || '').trim()) {
        metadata.parentNodeId = parentNodeId;
      }

      normalizedNode.metadata = metadata;
    }

    delete normalizedNode.parent;
    return normalizedNode;
  });

  return dump(next, { noRefs: true, lineWidth: 120, sortKeys: false });
}

export default function ManualRoadmapPage() {
  const { accessToken } = useAuth();
  const { addNotification } = useNotification();
  const roadmapId = parseQueryParam('id');
  const [selectedSampleKey, setSelectedSampleKey] = useState(SAMPLE_ROADMAPS[0].key);
  const [yamlCode, setYamlCode] = useState(() => SAMPLE_ROADMAPS[0].yaml);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState({ title: '', description: '', nodes: [], edges: [] });
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [layoutPositions, setLayoutPositions] = useState({});
  const [isComputingLayout, setIsComputingLayout] = useState(false);
  const [editorRatio, setEditorRatio] = useState(MANUAL_ROADMAP_SPLIT_DEFAULT_RATIO);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [isResizingLayout, setIsResizingLayout] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState(resolveMonacoTheme);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const layoutRef = useRef(null);
  const previewStageRef = useRef(null);
  const resizeDragRef = useRef({ startX: 0, startRatio: MANUAL_ROADMAP_SPLIT_DEFAULT_RATIO });
  const currentSample = SAMPLE_ROADMAPS.find((sample) => sample.key === selectedSampleKey) || SAMPLE_ROADMAPS[0];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePreviewWheel = (event) => {
      if (!previewStageRef.current || !previewStageRef.current.contains(event.target)) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    window.addEventListener('wheel', handlePreviewWheel, { passive: false, capture: true });

    return () => {
      window.removeEventListener('wheel', handlePreviewWheel, true);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const syncTheme = () => {
      setEditorTheme(resolveMonacoTheme());
    };

    syncTheme();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          syncTheme();
          break;
        }
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const serializedPrefill = window.sessionStorage.getItem(MANUAL_ROADMAP_PREFILL_STORAGE_KEY);
    if (!serializedPrefill) {
      return;
    }

    window.sessionStorage.removeItem(MANUAL_ROADMAP_PREFILL_STORAGE_KEY);

    try {
      const parsedPrefill = JSON.parse(serializedPrefill);
      const prefillYamlCode = typeof parsedPrefill?.yamlCode === 'string' ? parsedPrefill.yamlCode : '';

      if (!prefillYamlCode.trim()) {
        return;
      }

      setSelectedSampleKey('custom');
      setYamlCode(prefillYamlCode);
      setApiError('');
      setSuccessMessage('');
    } catch {
      // Ignore malformed prefill payload and keep default editor content.
    }
  }, []);

  useEffect(() => {
    try {
      const normalizedYaml = normalizeYamlForPersistence(yamlCode);
      const parsed = parseManualRoadmapYaml(normalizedYaml);
      setPreview(parsed);
      setValidationError('');
      setTitle(parsed.title || 'Computer Science Core');
      setDescription(parsed.description || '');
    } catch (err) {
      setValidationError(err.message);
    }
  }, [yamlCode]);

  useEffect(() => {
    if (!apiError) {
      return;
    }
    addNotification(apiError, 'error');
    setApiError('');
  }, [apiError, addNotification]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    addNotification(successMessage, 'success');
    setSuccessMessage('');
  }, [successMessage, addNotification]);

  /**
   * Compute ELK.js layout whenever nodes/edges change
   */
  useEffect(() => {
    if (preview.nodes.length === 0) {
      setLayoutPositions({});
      return;
    }

    let isMounted = true;
    setIsComputingLayout(true);

    (async () => {
      try {
        const positions = await computeLayoutSafe(
          preview.nodes,
          preview.edges,
          { direction: 'RIGHT', nodeSpacing: 40, rankSpacing: 80 },
          true  // useFallback
        );

        if (isMounted) {
          setLayoutPositions(positions);
        }
      } catch (err) {
        console.error('Layout computation error:', err);
        if (isMounted) {
          setValidationError(`Không thể tính toán bố cục: ${err.message}`);
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
  }, [preview.nodes, preview.edges]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncEditorWidth = () => {
      setIsCompactLayout(window.matchMedia('(max-width: 1100px)').matches);
      const layoutWidth = layoutRef.current?.getBoundingClientRect().width || 0;
      setLayoutWidth(layoutWidth);
      if (!layoutWidth) {
        return;
      }

      setEditorRatio((currentRatio) => clamp(currentRatio, MANUAL_ROADMAP_SPLIT_MIN_RATIO, MANUAL_ROADMAP_SPLIT_MAX_RATIO));
    };

    syncEditorWidth();
    window.addEventListener('resize', syncEditorWidth);

    return () => {
      window.removeEventListener('resize', syncEditorWidth);
    };
  }, []);

  useEffect(() => {
    if (!isResizingLayout || typeof window === 'undefined') {
      return undefined;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const applyWidth = (clientX) => {
      const currentLayoutWidth = layoutRef.current?.getBoundingClientRect().width || 0;
      if (!currentLayoutWidth) {
        return;
      }

      const resizableWidth = Math.max(1, currentLayoutWidth - MANUAL_ROADMAP_RESIZER_WIDTH);

      const delta = (resizeDragRef.current.startX - clientX) / resizableWidth;
      const nextRatio = clamp(
        resizeDragRef.current.startRatio + delta,
        MANUAL_ROADMAP_SPLIT_MIN_RATIO,
        MANUAL_ROADMAP_SPLIT_MAX_RATIO,
      );

      setEditorRatio(nextRatio);
    };

    const handlePointerMove = (event) => {
      applyWidth(event.clientX);
    };

    const stopResizing = () => {
      setIsResizingLayout(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    };
  }, [isResizingLayout]);

  const handleResizePointerDown = useCallback((event) => {
    if (event.button !== 0) {
      return;
    }

    const layoutWidth = layoutRef.current?.getBoundingClientRect().width || 0;
    if (!layoutWidth) {
      return;
    }

    event.preventDefault();
    resizeDragRef.current = {
      startX: event.clientX,
      startRatio: editorRatio,
    };
    setIsResizingLayout(true);
  }, [editorRatio]);

  const handleResizeKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    const layoutWidth = layoutRef.current?.getBoundingClientRect().width || 0;
    if (!layoutWidth) {
      return;
    }

    event.preventDefault();

    if (event.key === 'Home') {
      setEditorRatio(MANUAL_ROADMAP_SPLIT_MIN_RATIO);
      return;
    }

    if (event.key === 'End') {
      setEditorRatio(MANUAL_ROADMAP_SPLIT_MAX_RATIO);
      return;
    }

    const step = event.shiftKey ? 48 : 24;
    const resizableWidth = Math.max(1, layoutWidth - MANUAL_ROADMAP_RESIZER_WIDTH);
    setEditorRatio((currentRatio) => clamp(
      currentRatio + (event.key === 'ArrowLeft' ? -step : step) / resizableWidth,
      MANUAL_ROADMAP_SPLIT_MIN_RATIO,
      MANUAL_ROADMAP_SPLIT_MAX_RATIO,
    ));
  }, [layoutWidth]);

  useEffect(() => {
    if (!roadmapId || !accessToken) return;

    let isMounted = true;
    (async () => {
      try {
        const roadmap = await manualRoadmapApi.getManualRoadmap(accessToken, roadmapId);
        if (!isMounted) return;
        setYamlCode(roadmap.yamlCode || yamlCode);
        setSelectedSampleKey('custom');
        setTitle(roadmap.title || '');
        setDescription(roadmap.description || '');
      } catch (err) {
        if (!isMounted) return;
        setApiError(err.message || 'Không thể tải roadmap thủ công.');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accessToken, roadmapId]);

  const handleSampleChange = (event) => {
    const nextKey = event.target.value;

    if (nextKey === 'custom') {
      setSelectedSampleKey('custom');
      return;
    }

    const nextSample = SAMPLE_ROADMAPS.find((sample) => sample.key === nextKey);

    if (!nextSample) {
      return;
    }

    setSelectedSampleKey(nextKey);
    setYamlCode(nextSample.yaml);
    setApiError('');
    setSuccessMessage('');
  };

  const handleRestoreSample = () => {
    setSelectedSampleKey(currentSample.key);
    setYamlCode(currentSample.yaml);
    setApiError('');
    setSuccessMessage('');
  };

  useEffect(() => {
    if (!Array.isArray(preview.nodes) || preview.nodes.length === 0) {
      setSelectedNodeId('');
      return;
    }
    const exists = preview.nodes.some((node) => node.nodeId === selectedNodeId);
    if (!exists) {
      setSelectedNodeId(preview.nodes[0].nodeId);
    }
  }, [preview.nodes, selectedNodeId]);

  const writeYaml = (transform) => {
    try {
      const parsed = load(yamlCode);
      if (!parsed || typeof parsed !== 'object') {
        setApiError('YAML phải là một đối tượng trước khi chỉnh sửa học liệu.');
        return;
      }

      const next = transform(parsed);
      const nextYaml = dump(next, { noRefs: true, lineWidth: 120, sortKeys: false });
      setYamlCode(nextYaml);
      setApiError('');
    } catch (err) {
      setApiError(err.message || 'Không thể cập nhật học liệu trong YAML.');
    }
  };

  const handleAddResource = () => {
    const nodeId = String(selectedNodeId || '').trim();
    const title = String(resourceTitle || '').trim();
    const url = String(resourceUrl || '').trim();

    if (!nodeId) {
      setApiError('Vui lòng chọn một node trước khi thêm học liệu.');
      return;
    }
    if (!title || !url) {
      setApiError('Vui lòng nhập tiêu đề và URL cho học liệu.');
      return;
    }

    writeYaml((parsed) => {
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const targetNode = nodes.find((node) => String(node.nodeId || node.id || '').trim() === nodeId);

      if (!targetNode) {
        throw new Error('Không tìm thấy node đã chọn trong YAML.');
      }

      if (!Array.isArray(targetNode.resources)) {
        targetNode.resources = [];
      }

      targetNode.resources.push({
        title,
        url,
        type: resourceType,
      });

      return parsed;
    });

    setResourceTitle('');
    setResourceUrl('');
  };

  const handleRemoveResource = (index) => {
    const nodeId = String(selectedNodeId || '').trim();
    if (!nodeId) return;

    writeYaml((parsed) => {
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const targetNode = nodes.find((node) => String(node.nodeId || node.id || '').trim() === nodeId);

      if (!targetNode || !Array.isArray(targetNode.resources)) {
        throw new Error('Không tìm thấy danh sách học liệu cho node đã chọn.');
      }

      targetNode.resources = targetNode.resources.filter((_, resourceIndex) => resourceIndex !== index);
      return parsed;
    });
  };

  const handleSave = async () => {
    setApiError('');
    setSuccessMessage('');

    if (!accessToken) {
      setApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để lưu roadmap.');
      return;
    }

    if (validationError) {
      setApiError('Vui lòng sửa các lỗi xác thực trước khi lưu.');
      return;
    }

    let persistableYamlCode = '';
    try {
      persistableYamlCode = normalizeYamlForPersistence(yamlCode);
    } catch (err) {
      setApiError(err.message || 'Không thể chuẩn hóa YAML để lưu.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await (roadmapId
        ? manualRoadmapApi.updateManualRoadmap(accessToken, roadmapId, { yamlCode: persistableYamlCode })
        : manualRoadmapApi.createManualRoadmap(accessToken, { yamlCode: persistableYamlCode }));

      setSuccessMessage(`Đã ${roadmapId ? 'cập nhật' : 'tạo'} roadmap thành công.`);

      if (result && result.syncSkipped) {
        addNotification('Roadmap đã được lưu cục bộ nhưng chưa được đồng bộ sang primary vì hồ sơ onboarding chưa hoàn thành.', 'warning');
      }
    } catch (err) {
      if (err?.status === 401) {
        setApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi lưu lại roadmap.');
      } else {
        setApiError(err.message || 'Không thể lưu roadmap.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const highlightNodeInEditor = (nodeId) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !nodeId) return;

    const lineNumber = findNodeLine(yamlCode, nodeId);
    if (!lineNumber) return;

    const model = editor.getModel();
    const lineContent = model ? model.getLineContent(lineNumber) : '';
    const endColumn = Math.max(2, lineContent.length + 1);

    editor.revealLineInCenter(lineNumber);
    editor.setPosition({ lineNumber, column: 1 });
    editor.setSelection(new monaco.Range(lineNumber, 1, lineNumber, endColumn));
    editor.focus();
  };

  const handleSelectNode = (nodeId, { fromGraph = false } = {}) => {
    setSelectedNodeId(nodeId);
    if (fromGraph) {
      highlightNodeInEditor(nodeId);
    }
  };

  const displayNodes = preview.nodes || [];
  const selectedNode = displayNodes.find((node) => node.nodeId === selectedNodeId);
  const selectedResources = Array.isArray(selectedNode?.resources) ? selectedNode.resources : [];
  const selectedNodeName = selectedNode?.label || 'node';
  const actionsDisabled = isSaving;
  const renderStatusMessage = validationError
    ? `YAML không hợp lệ: ${validationError}`
    : isComputingLayout
      ? 'Đang render preview...'
      : displayNodes.length === 0
        ? 'Chưa có node hợp lệ để preview.'
        : 'Preview đã sẵn sàng.';

  const resizableWidth = layoutWidth > 0 ? Math.max(0, layoutWidth - MANUAL_ROADMAP_RESIZER_WIDTH) : 0;
  const editorPaneWidth = layoutWidth > 0 ? Math.round(resizableWidth * editorRatio) : 0;
  const previewPaneWidth = layoutWidth > 0 ? Math.max(0, resizableWidth - editorPaneWidth) : 0;

  return (
    <div className="skill-tree-page manual-roadmap-page">
      <div
        className="skill-tree-layout manual-roadmap-layout"
        ref={layoutRef}
      >
        <main
          className="skill-tree-layout__canvas manual-roadmap-layout__canvas"
          aria-label="Manual roadmap preview"
          style={layoutWidth > 0 && !isCompactLayout
            ? {
              flexBasis: `${previewPaneWidth}px`,
              width: `${previewPaneWidth}px`,
            }
            : undefined
          }
        >
          <section className="skill-tree-summary-card" aria-label="Roadmap summary">
            <h2 className="skill-tree-summary-card__title">{title || 'Manual roadmap draft'}</h2>
            <p className="skill-tree-summary-card__meta">{description || 'Use the YAML editor to define nodes, prerequisites, and resources.'}</p>
            <div className={`manual-roadmap-summary-card__status ${validationError ? 'manual-roadmap-summary-card__status--error' : 'manual-roadmap-summary-card__status--info'}`} role="status" aria-live="polite">
              {renderStatusMessage}
            </div>
          </section>

          <div
            className="manual-roadmap-preview-stage"
            ref={previewStageRef}
          >
            <RoadmapGraphRenderer
              nodes={displayNodes}
              edges={preview.edges || []}
              positions={layoutPositions}
              onNodeSelect={(nodeId) => handleSelectNode(nodeId, { fromGraph: true })}
              loading={isComputingLayout}
            />
          </div>
        </main>

        <div
          className="manual-roadmap-layout__divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize roadmap preview and editor"
          aria-valuemin={Math.round(MANUAL_ROADMAP_SPLIT_MIN_RATIO * 100)}
          aria-valuemax={Math.round(MANUAL_ROADMAP_SPLIT_MAX_RATIO * 100)}
          aria-valuenow={Math.round(editorRatio * 100)}
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
        >
          <ManualRoadmapDividerHandle />
        </div>

        <aside
          className="skill-tree-panel manual-roadmap-panel"
          aria-label="Manual roadmap editor"
          style={layoutWidth > 0 && !isCompactLayout
            ? {
              flexBasis: `${editorPaneWidth}px`,
              width: `${editorPaneWidth}px`,
            }
            : undefined
          }
        >
          <div className="skill-tree-panel__header">
            <div className="skill-tree-panel__title-row">
              <div className="skill-tree-panel__title-wrap">
                <h2 className="skill-tree-panel__title">Editor roadmap thủ công</h2>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="manual-roadmap-help-button"
                  title="View YAML format guide"
                  aria-label="Open YAML format guide"
                >
                  <CircleHelp size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="manual-roadmap-panel__actions">
                <button type="button" onClick={handleRestoreSample} className="manual-roadmap-button manual-roadmap-button--secondary">
                  <History className="manual-roadmap-button__icon" aria-hidden="true" />
                  Phục hồi mẫu
                </button>
                <button type="button" onClick={handleSave} disabled={actionsDisabled} className="manual-roadmap-button manual-roadmap-button--primary">
                  <Save className="manual-roadmap-button__icon" aria-hidden="true" />
                  {isSaving ? 'Đang lưu...' : 'Lưu roadmap'}
                </button>
              </div>
            </div>
          </div>

          <div className="skill-tree-panel__content manual-roadmap-panel__content">
            <section className="resources-tab__section manual-roadmap-section">
              <h4 className="resources-tab__heading">Chọn mẫu roadmap</h4>
              <div className="manual-roadmap-form__grid">
                <select
                  className="manual-roadmap-input"
                  value={selectedSampleKey}
                  onChange={handleSampleChange}
                >
                  {SAMPLE_ROADMAPS.map((sample) => (
                    <option key={sample.key} value={sample.key}>
                      {sample.label}
                    </option>
                  ))}
                  <option value="custom">Custom / loaded roadmap</option>
                </select>
                <p className="manual-roadmap-preview__sample-note">
                  {currentSample?.description || 'Edit the YAML to create your own roadmap.'}
                </p>
              </div>
            </section>

            <section className="resources-tab__section manual-roadmap-section">
              <h4 className="resources-tab__heading">Định nghĩa YAML</h4>
              <div className="manual-roadmap-editor-shell">
                <Editor
                  height="100%"
                  defaultLanguage="yaml"
                  theme={editorTheme}
                  value={yamlCode}
                  onChange={(value) => {
                    setSelectedSampleKey('custom');
                    setYamlCode(value || '');
                  }}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                  }}
                  options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                />
              </div>
              {validationError && <div className="manual-roadmap-alert manual-roadmap-alert--error">{validationError}</div>}
            </section>

            <section className="resources-tab__section manual-roadmap-section">
              <h4 className="resources-tab__heading">Quản lý học liệu</h4>
              <div className="manual-roadmap-form">
                <div className="manual-roadmap-field">
                  <label htmlFor="manual-roadmap-node" className="manual-roadmap-field__label">Node</label>
                  <select
                    id="manual-roadmap-node"
                    value={selectedNodeId}
                    onChange={(event) => handleSelectNode(event.target.value)}
                    className="manual-roadmap-input"
                  >
                    {displayNodes.map((node) => (
                      <option key={node.nodeId} value={node.nodeId}>
                        {node.label || node.nodeId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="manual-roadmap-form__grid">
                  <input
                    className="manual-roadmap-input"
                    placeholder="Resource title"
                    value={resourceTitle}
                    onChange={(event) => setResourceTitle(event.target.value)}
                  />
                  <input
                    className="manual-roadmap-input"
                    placeholder="https://..."
                    value={resourceUrl}
                    onChange={(event) => setResourceUrl(event.target.value)}
                  />
                  <select
                    className="manual-roadmap-input"
                    value={resourceType}
                    onChange={(event) => setResourceType(event.target.value)}
                  >
                    <option value="link">Link</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                  </select>
                  <button type="button" onClick={handleAddResource} className="manual-roadmap-button manual-roadmap-button--primary manual-roadmap-button--block">
                    Thêm học liệu
                  </button>
                </div>

                <div className="manual-roadmap-resources">
                  <h3 className="manual-roadmap-resources__title">Resources của {selectedNodeName}</h3>
                  {selectedResources.length === 0 ? (
                    <p className="manual-roadmap-resources__empty">Chưa có resource.</p>
                  ) : (
                    selectedResources.map((resource, index) => (
                      <div key={`${resource.title || 'resource'}-${index}`} className="manual-roadmap-resource-item">
                        <div className="manual-roadmap-resource-item__body">
                          <p className="manual-roadmap-resource-item__title">{resource.title || `Resource ${index + 1}`}</p>
                          <p className="manual-roadmap-resource-item__url">{resource.url || '-'}</p>
                          <p className="manual-roadmap-resource-item__meta">Type: {resource.type || 'link'}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveResource(index)} className="manual-roadmap-button manual-roadmap-button--danger">
                          Xóa
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>

      <YamlGuideOverlay isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
