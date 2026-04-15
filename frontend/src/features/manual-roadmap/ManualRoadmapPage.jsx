import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import Editor from '@monaco-editor/react';
import { dump, load } from 'js-yaml';
import manualRoadmapApi from './manualRoadmap.api';
import ManualRoadmapPreview from './ManualRoadmapPreview';
import { parseManualRoadmapYaml } from './manualRoadmap.validation';
import '../skill-tree/skill-tree.css';
import './manual-roadmap.css';
import webDevelopmentSample from '../../../../specs/001-manual-roadmap-generator/sample-manual-roadmap.yaml?raw';
import dataAnalyticsSample from '../../../../specs/001-manual-roadmap-generator/sample-data-analytics-roadmap.yaml?raw';
import cloudDevopsSample from '../../../../specs/001-manual-roadmap-generator/sample-cloud-devops-roadmap.yaml?raw';
import cybersecuritySample from '../../../../specs/001-manual-roadmap-generator/sample-cybersecurity-roadmap.yaml?raw';

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
];

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

export default function ManualRoadmapPage() {
  const { accessToken } = useAuth();
  const roadmapId = parseQueryParam('id');
  const [selectedSampleKey, setSelectedSampleKey] = useState(SAMPLE_ROADMAPS[0].key);
  const [yamlCode, setYamlCode] = useState(() => SAMPLE_ROADMAPS[0].yaml);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState({ title: '', description: '', nodes: [] });
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const currentSample = SAMPLE_ROADMAPS.find((sample) => sample.key === selectedSampleKey) || SAMPLE_ROADMAPS[0];

  useEffect(() => {
    try {
      const parsed = parseManualRoadmapYaml(yamlCode);
      setPreview(parsed);
      setValidationError('');
      setTitle(parsed.title || 'Computer Science Core');
      setDescription(parsed.description || '');
    } catch (err) {
      setValidationError(err.message);
    }
  }, [yamlCode]);

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
        setApiError(err.message || 'Unable to load manual roadmap.');
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
        setApiError('YAML must be an object before editing resources.');
        return;
      }

      const next = transform(parsed);
      const nextYaml = dump(next, { noRefs: true, lineWidth: 120, sortKeys: false });
      setYamlCode(nextYaml);
      setApiError('');
    } catch (err) {
      setApiError(err.message || 'Unable to update resources in YAML.');
    }
  };

  const handleAddResource = () => {
    const nodeId = String(selectedNodeId || '').trim();
    const title = String(resourceTitle || '').trim();
    const url = String(resourceUrl || '').trim();

    if (!nodeId) {
      setApiError('Please select a node before adding a resource.');
      return;
    }
    if (!title || !url) {
      setApiError('Resource title and URL are required.');
      return;
    }

    writeYaml((parsed) => {
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const targetNode = nodes.find((node) => String(node.nodeId || node.id || '').trim() === nodeId);

      if (!targetNode) {
        throw new Error('Selected node was not found in YAML.');
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
        throw new Error('No resource list found for selected node.');
      }

      targetNode.resources = targetNode.resources.filter((_, resourceIndex) => resourceIndex !== index);
      return parsed;
    });
  };

  const handleSave = async () => {
    setApiError('');
    setSuccessMessage('');
    if (validationError) {
      setApiError('Please fix validation errors before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = await (roadmapId
        ? manualRoadmapApi.updateManualRoadmap(accessToken, roadmapId, { yamlCode })
        : manualRoadmapApi.createManualRoadmap(accessToken, { yamlCode }));

      setSuccessMessage(`Roadmap ${roadmapId ? 'updated' : 'created'} successfully.`);
      if (!roadmapId && payload?._id) {
        window.history.replaceState({}, '', `/manual-roadmap?id=${payload._id}`);
      }
    } catch (err) {
      setApiError(err.message || 'Unable to save roadmap.');
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
  const actionsDisabled = isSaving;

  return (
    <div className="skill-tree-page manual-roadmap-page">
      <div className="skill-tree-layout manual-roadmap-layout">
        <main className="skill-tree-layout__canvas manual-roadmap-layout__canvas" aria-label="Manual roadmap preview">
          <section className="skill-tree-summary-card" aria-label="Roadmap summary">
            <h2 className="skill-tree-summary-card__title">{title || 'Manual roadmap draft'}</h2>
            <p className="skill-tree-summary-card__meta">{description || 'Use the YAML editor to define nodes, prerequisites, and resources.'}</p>
          </section>

          <div className="manual-roadmap-preview-stage">
            <ManualRoadmapPreview
              nodes={displayNodes}
              selectedNodeId={selectedNodeId}
              onNodeSelect={(nodeId) => handleSelectNode(nodeId, { fromGraph: true })}
            />
          </div>
        </main>

        <aside className="skill-tree-panel manual-roadmap-panel" aria-label="Manual roadmap editor">
          <div className="skill-tree-panel__header">
            <div className="skill-tree-panel__title-row">
              <div className="skill-tree-panel__title-wrap">
                <h2 className="skill-tree-panel__title">Manual roadmap editor</h2>
                <p className="skill-tree-panel__subtitle">YAML and resources</p>
              </div>

              <div className="manual-roadmap-panel__actions">
                <button type="button" onClick={handleRestoreSample} className="manual-roadmap-button manual-roadmap-button--secondary">
                  <span className="material-symbols-outlined manual-roadmap-button__icon">history</span>
                  Phục hồi mẫu
                </button>
                <button type="button" onClick={handleSave} disabled={actionsDisabled} className="manual-roadmap-button manual-roadmap-button--primary">
                  <span className="material-symbols-outlined manual-roadmap-button__icon">save</span>
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
                  value={yamlCode}
                  onChange={(value) => {
                    setSelectedSampleKey('custom');
                    setYamlCode(value || '');
                  }}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                  }}
                  options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', theme: 'vs-light' }}
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
                    Add Resource
                  </button>
                </div>

                <div className="manual-roadmap-resources">
                  <h3 className="manual-roadmap-resources__title">Resources của {selectedNode?.label || 'node'}</h3>
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

      <footer className="skill-tree-page__footer manual-roadmap-page__footer">
        <span>© 2024 UET-VNU University of Engineering and Technology</span>
        <div className="manual-roadmap-page__footer-links">
          <a className="manual-roadmap-page__footer-link" href="#">GitHub</a>
          <a className="manual-roadmap-page__footer-link" href="#">Documentation</a>
          <a className="manual-roadmap-page__footer-link" href="#">Privacy Policy</a>
        </div>
      </footer>

      {apiError && (
        <div className="manual-roadmap-toast manual-roadmap-toast--error">
          {apiError}
        </div>
      )}
      {successMessage && (
        <div className="manual-roadmap-toast manual-roadmap-toast--success">
          {successMessage}
        </div>
      )}
    </div>
  );
}
