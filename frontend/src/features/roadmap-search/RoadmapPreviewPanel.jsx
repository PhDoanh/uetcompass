import React, { useEffect, useMemo, useState } from 'react';
import ManualRoadmapPreview from '../manual-roadmap/ManualRoadmapPreview';

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

            const resources = Array.isArray(node?.resources)
                ? node.resources
                : (Array.isArray(node?.relatedCourses)
                    ? node.relatedCourses.map((course, index) => ({
                        title: String(course?.title || `Course ${index + 1}`),
                        url: String(course?.url || ''),
                        type: 'course',
                    }))
                    : []);

            return {
                nodeId,
                label: String(node?.label || node?.skillName || nodeId).trim(),
                description: String(node?.description || node?.reason || '').trim(),
                parent: parentNodeId || undefined,
                prerequisites,
                status: String(node?.status || 'pending').trim() || 'pending',
                resources,
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
        } else {
            rootNodes.push({
                ...node,
                parent: undefined,
                prerequisites: Array.isArray(node.prerequisites)
                    ? node.prerequisites.filter((id) => id && nodeIdSet.has(id))
                    : [],
            });
        }
    });

    return [...rootNodes, ...childNodes];
}

function buildRoadmapStats(nodes = []) {
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    const doneCount = safeNodes.filter((node) => ['done', 'completed'].includes(String(node.status || '').trim())).length;
    const inProgressCount = safeNodes.filter((node) => ['in_progress', 'inProgress'].includes(String(node.status || '').trim())).length;
    const lockedCount = safeNodes.filter((node) => ['locked', 'skip'].includes(String(node.status || '').trim())).length;
    const rootCount = safeNodes.filter((node) => !node.parent).length;
    const childCount = Math.max(0, safeNodes.length - rootCount);
    const resourceCount = safeNodes.reduce((total, node) => {
        const count = Array.isArray(node.resources) ? node.resources.length : 0;
        return total + count;
    }, 0);

    return {
        totalCount: safeNodes.length,
        rootCount,
        childCount,
        doneCount,
        inProgressCount,
        lockedCount,
        pendingCount: Math.max(0, safeNodes.length - doneCount - inProgressCount - lockedCount),
        resourceCount,
    };
}

export default function RoadmapPreviewPanel({ previewData, previewStatus = 'idle', errorMessage = '' }) {
    const normalizedNodes = useMemo(() => normalizePreviewNodes(previewData?.nodes || []), [previewData]);
    const stats = useMemo(() => buildRoadmapStats(normalizedNodes), [normalizedNodes]);
    const [selectedNodeId, setSelectedNodeId] = useState('');

    const activeNodeId = selectedNodeId || normalizedNodes?.[0]?.nodeId || '';

    useEffect(() => {
        setSelectedNodeId((current) => {
            if (!normalizedNodes.length) {
                return '';
            }
            if (current && normalizedNodes.some((node) => node.nodeId === current)) {
                return current;
            }
            return normalizedNodes[0].nodeId;
        });
    }, [normalizedNodes]);

    if (previewStatus === 'loading') {
        return <p style={{ color: '#64748b' }}>Loading preview...</p>;
    }

    if (previewStatus === 'error') {
        return <p style={{ color: '#b91c1c' }}>{errorMessage || 'Unable to load roadmap preview.'}</p>;
    }

    if (!previewData) {
        return <p style={{ color: '#64748b' }}>Select a roadmap to preview details.</p>;
    }

    if (!Array.isArray(previewData.nodes) || previewData.nodes.length === 0) {
        return (
            <div className="roadmap-preview-panel" aria-label="Roadmap preview panel">
                <h2 style={{ marginTop: 0 }}>{previewData.title || 'Roadmap Preview'}</h2>
                <p style={{ color: '#64748b' }}>{previewData.description || 'No description available.'}</p>
                <p style={{ color: '#64748b' }}>No nodes to preview yet.</p>
            </div>
        );
    }

    return (
        <div className="roadmap-preview-panel" aria-label="Roadmap preview panel">
            <h2 style={{ marginTop: 0 }}>{previewData.title || 'Roadmap Preview'}</h2>
            <p style={{ color: '#64748b' }}>{previewData.description || 'No description available.'}</p>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 8,
                    marginBottom: 12,
                }}
            >
                <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe', background: '#eff6ff', color: '#1e40af', fontSize: 13, fontWeight: 600 }}>
                    Nodes: {stats.totalCount}
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fafc', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                    Root/Child: {stats.rootCount}/{stats.childCount}
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #dcfce7', background: '#f0fdf4', color: '#166534', fontSize: 13, fontWeight: 600 }}>
                    Done/In progress: {stats.doneCount}/{stats.inProgressCount}
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 600 }}>
                    Pending/Locked: {stats.pendingCount}/{stats.lockedCount}
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe', background: '#eef2ff', color: '#1d4ed8', fontSize: 13, fontWeight: 600 }}>
                    Resources: {stats.resourceCount}
                </div>
            </div>
            <div style={{ width: '100%', height: '100%', minHeight: 560, borderRadius: 16, overflow: 'auto', border: '1px solid #e0e0e0' }}>
                <ManualRoadmapPreview
                    nodes={normalizedNodes}
                    selectedNodeId={activeNodeId}
                    onNodeSelect={setSelectedNodeId}
                />
            </div>
        </div>
    );
}
