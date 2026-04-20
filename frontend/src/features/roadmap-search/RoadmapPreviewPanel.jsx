import React, { useEffect, useMemo, useState } from 'react';
import RoadmapGraphRenderer from '../../shared/RoadmapGraphRenderer';
import { computeLayoutSafe } from '../../shared/elkLayoutEngine';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';

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
                parentNodeId: parentNodeId || undefined,
                type: String(node?.type || '').trim() || (parentNodeId ? 'sub_topic' : 'main_topic'),
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
                parentNodeId: undefined,
                prerequisites: Array.isArray(node.prerequisites)
                    ? node.prerequisites.filter((id) => id && nodeIdSet.has(id))
                    : [],
            });
        }
    });

    return [...rootNodes, ...childNodes];
}

export default function RoadmapPreviewPanel({ previewData, previewStatus = 'idle', errorMessage = '' }) {
    const normalizedNodes = useMemo(() => normalizePreviewNodes(previewData?.nodes || []), [previewData]);
    const previewEdges = useMemo(() => (Array.isArray(previewData?.edges) ? previewData.edges : []), [previewData]);
    const [layoutPositions, setLayoutPositions] = useState({});
    const [isComputingLayout, setIsComputingLayout] = useState(false);
    const [openingRoadmap, setOpeningRoadmap] = useState(false);

    const handleOpenRoadmap = async () => {
        if (openingRoadmap || typeof window === 'undefined' || !previewData) {
            return;
        }

        setOpeningRoadmap(true);

        try {
            let roadmapId = String(previewData?._id || '').trim();

            if (!roadmapId) {
                const normalizedTitle = String(previewData?.title || '').trim();
                if (!normalizedTitle) {
                    throw new Error('Missing roadmap title');
                }

                const searchResult = await manualRoadmapApi.listPublicManualRoadmaps({
                    q: normalizedTitle,
                    page: 1,
                    limit: 20,
                });
                const items = Array.isArray(searchResult?.items) ? searchResult.items : [];
                const matchedRoadmap = items.find(
                    (roadmap) => String(roadmap?.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
                ) || items[0] || null;

                roadmapId = String(matchedRoadmap?._id || '').trim();
            }

            if (!roadmapId) {
                throw new Error('Roadmap not found');
            }

            window.location.assign(`/skill-tree/${encodeURIComponent(roadmapId)}`);
        } catch {
            // Keep panel interaction non-blocking; fail silently like homepage card flow.
        } finally {
            setOpeningRoadmap(false);
        }
    };

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
        return <p className="roadmap-preview-panel__state">Loading preview...</p>;
    }

    if (previewStatus === 'error') {
        return <p className="roadmap-preview-panel__state roadmap-preview-panel__state--error">{errorMessage || 'Unable to load roadmap preview.'}</p>;
    }

    if (!previewData) {
        return <p className="roadmap-preview-panel__state">Select a roadmap to preview details.</p>;
    }

    if (!Array.isArray(previewData.nodes) || previewData.nodes.length === 0) {
        return (
            <div className="roadmap-preview-panel" aria-label="Roadmap preview panel">
                <div className="roadmap-preview-panel__hero">
                    <div>
                        <h2 className="roadmap-preview-panel__title">{previewData.title || 'Roadmap Preview'}</h2>
                        <p className="roadmap-preview-panel__description">{previewData.description || 'No description available.'}</p>
                    </div>
                    <button type="button" onClick={handleOpenRoadmap} className="roadmap-preview-panel__cta" disabled={openingRoadmap}>
                        {openingRoadmap ? 'Đang mở...' : 'Mở roadmap'}
                    </button>
                </div>
                <p className="roadmap-preview-panel__state">No nodes to preview yet.</p>
            </div>
        );
    }

    return (
        <div className="roadmap-preview-panel" aria-label="Roadmap preview panel">
            <div className="roadmap-preview-panel__hero">
                <div>
                    <h2 className="roadmap-preview-panel__title">{previewData.title || 'Roadmap Preview'}</h2>
                    <p className="roadmap-preview-panel__description">{previewData.description || 'No description available.'}</p>
                </div>
                <button type="button" onClick={handleOpenRoadmap} className="roadmap-preview-panel__cta" disabled={openingRoadmap}>
                    {openingRoadmap ? 'Đang mở...' : 'Mở roadmap'}
                </button>
            </div>
            <div className="roadmap-preview-panel__graph-shell">
                <RoadmapGraphRenderer
                    nodes={normalizedNodes}
                    edges={previewEdges}
                    positions={layoutPositions}
                    onNodeSelect={() => { }}
                    loading={isComputingLayout}
                    controlsVisible={false}
                />
            </div>
        </div>
    );
}
