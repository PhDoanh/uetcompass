import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import Editor from '@monaco-editor/react';
import { dump, load } from 'js-yaml';
import manualRoadmapApi from './manualRoadmap.api';
import ManualRoadmapPreview from './ManualRoadmapPreview';
import { parseManualRoadmapYaml } from './manualRoadmap.validation';

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
  const [yamlCode, setYamlCode] = useState(`title: Fullstack Web Roadmap (Manual Test)\ndescription: Sample YAML for testing manual roadmap creation flow.\nnodes:\n  - nodeId: HTML_CSS\n    label: HTML & CSS Fundamentals\n    description: Build static pages and responsive layouts.\n    status: done\n    prerequisites: []\n    skills:\n      - semantic-html\n      - responsive-css\n\n  - nodeId: JS_CORE\n    label: JavaScript Core\n    description: Learn syntax, DOM, and async fundamentals.\n    status: in_progress\n    prerequisites:\n      - HTML_CSS\n    skills:\n      - dom-manipulation\n      - async-await\n\n  - nodeId: REACT_BASICS\n    label: React Basics\n    description: Components, state, props, and hooks.\n    status: pending\n    prerequisites:\n      - JS_CORE\n    skills:\n      - component-thinking\n      - state-management\n\n  - nodeId: NODE_EXPRESS\n    label: Node.js + Express API\n    description: Build REST APIs and middleware.\n    status: pending\n    prerequisites:\n      - JS_CORE\n    skills:\n      - express-routing\n      - api-design\n\n  - nodeId: MONGODB_CRUD\n    label: MongoDB CRUD\n    description: Model data and perform CRUD operations.\n    status: pending\n    prerequisites:\n      - NODE_EXPRESS\n    skills:\n      - schema-design\n      - query-optimization\n\n  - nodeId: AUTH_JWT\n    label: Authentication with JWT\n    description: Protect APIs using token-based auth.\n    status: pending\n    prerequisites:\n      - NODE_EXPRESS\n    skills:\n      - jwt\n      - auth-guards\n\n  - nodeId: FULLSTACK_INTEGRATION\n    label: Fullstack Integration\n    description: Connect frontend to backend and deploy.\n    status: locked\n    prerequisites:\n      - REACT_BASICS\n      - MONGODB_CRUD\n      - AUTH_JWT\n    skills:\n      - integration-testing\n      - deployment\n`);
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
    <div className="bg-background font-body text-on-surface min-h-screen flex flex-col overflow-hidden">
      <div className="px-6 py-3 flex items-center justify-between bg-white border-b border-outline-variant/10">
        <h1 className="font-headline text-xl font-extrabold text-[#003E79] tracking-tight">Quản lý lộ trình</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low text-primary font-medium text-sm rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-base">history</span>
            Phục hồi
          </button>
          <button onClick={handleSave} disabled={actionsDisabled} className="flex items-center gap-2 px-3 py-1.5 bg-[#0055A2] text-white font-medium text-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-base">save</span>
            {isSaving ? 'Đang lưu...' : 'Lưu lộ trình'}
          </button>
        </div>
      </div>

      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-surface-container-low gap-px">
        <section className="col-span-5 flex flex-col bg-white overflow-hidden border-r border-outline-variant/20">
          <div className="flex h-1/2 flex-col border-b border-outline-variant/20">
            <div className="p-3 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between">
              <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Định nghĩa YAML</span>
              <span className="material-symbols-outlined text-outline text-base">code</span>
            </div>
            <div className="flex-1 p-4">
              <Editor
                height="100%"
                defaultLanguage="yaml"
                value={yamlCode}
                onChange={(value) => setYamlCode(value || '')}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                }}
                options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', theme: 'vs-light' }}
              />
              {validationError && (
                <div className="mt-3 rounded-lg bg-[#ffebee] px-3 py-2 text-sm text-[#b71c1c]">{validationError}</div>
              )}
            </div>
          </div>

          <div className="flex h-1/2 flex-col overflow-hidden">
            <div className="p-3 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between">
              <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Quản lý học liệu</span>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Node</label>
                <select
                  value={selectedNodeId}
                  onChange={(event) => handleSelectNode(event.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                >
                  {displayNodes.map((node) => (
                    <option key={node.nodeId} value={node.nodeId}>
                      {node.label || node.nodeId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <input
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                  placeholder="Resource title"
                  value={resourceTitle}
                  onChange={(event) => setResourceTitle(event.target.value)}
                />
                <input
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                  placeholder="https://..."
                  value={resourceUrl}
                  onChange={(event) => setResourceUrl(event.target.value)}
                />
                <select
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                  value={resourceType}
                  onChange={(event) => setResourceType(event.target.value)}
                >
                  <option value="link">Link</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="w-full bg-[#0055A2] text-white rounded px-3 py-2 text-sm font-medium"
                >
                  Add Resource
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">Resources của {selectedNode?.label || 'node'}</h3>
                {selectedResources.length === 0 ? (
                  <p className="text-xs text-slate-500">Chưa có resource.</p>
                ) : (
                  selectedResources.map((resource, index) => (
                    <div key={`${resource.title || 'resource'}-${index}`} className="border border-slate-200 rounded p-2 bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{resource.title || `Resource ${index + 1}`}</p>
                          <p className="text-xs text-slate-500 break-all">{resource.url || '-'}</p>
                          <p className="text-xs text-slate-500">Type: {resource.type || 'link'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveResource(index)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-7 flex flex-col bg-white overflow-hidden relative">
          <div className="p-3 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
            <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Xem trước sơ đồ</span>
            <span className="text-xs text-slate-500">{displayNodes.length} nodes</span>
          </div>
          <div className="flex-1 relative overflow-hidden skill-canvas">
            <div className="absolute inset-0 p-4">
              <ManualRoadmapPreview
                nodes={displayNodes}
                selectedNodeId={selectedNodeId}
                onNodeSelect={(nodeId) => handleSelectNode(nodeId, { fromGraph: true })}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-outline-variant/10 py-3 px-6 z-30 flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-500 font-body">
        <span>© 2024 UET-VNU University of Engineering and Technology</span>
        <div className="flex gap-6">
          <a className="hover:text-[#0055A2] transition-colors" href="#">GitHub</a>
          <a className="hover:text-[#0055A2] transition-colors" href="#">Documentation</a>
          <a className="hover:text-[#0055A2] transition-colors" href="#">Privacy Policy</a>
        </div>
      </footer>

      {apiError && (
        <div className="fixed bottom-4 right-4 bg-error text-on-error px-4 py-2 rounded shadow-lg">
          {apiError}
        </div>
      )}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          {successMessage}
        </div>
      )}
    </div>
  );
}
