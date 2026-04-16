import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './roadmapGraphRenderer.css';

/**
 * Unified graph renderer in plane mode.
 * - Pan/zoom viewport
 * - Node-only cards (no long descriptions)
 * - Hierarchy/prerequisite connectors
 * - Parent-child cluster containers
 */
export function RoadmapGraphRenderer({
    nodes = [],
    edges = [],
    positions = {},
    onNodeSelect,
    loading = false,
    controlsVisible = true,
}) {
    const NODE_DIMENSIONS = {
        main_topic: { width: 330, height: 96 },
        sub_topic: { width: 220, height: 58 },
        group_container: { width: 270, height: 72 },
        choice_item: { width: 185, height: 50 },
        default: { width: 220, height: 58 },
    };

    const PARENT_WIDTH = NODE_DIMENSIONS.main_topic.width;
    const CHILD_COLUMN_WIDTH = 300;
    const CENTER_X = 760;
    const CHILD_SIDE_GAP = 320;

    const viewportRef = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [showClusters, setShowClusters] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const renderedNodes = useMemo(() => {
        return nodes.map((node) => {
            const pos = positions[node.nodeId];
            const nodeType = node.type || 'main_topic';
            const dims = NODE_DIMENSIONS[nodeType] || NODE_DIMENSIONS.default;
            const displayName = node.label || node.nodeId;
            return {
                id: node.nodeId,
                label: displayName,
                type: nodeType,
                parentNodeId: node.parentNodeId || null,
                prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites : [],
                position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
                // Keep stable sizes for consistent two-column layout and centered spine.
                width: dims.width,
                height: dims.height,
            };
        });
    }, [nodes, positions]);

    const planeNodes = useMemo(() => {
        if (renderedNodes.length === 0) return [];

        const normalized = renderedNodes.map((node) => ({
            id: node.id,
            label: node.label || node.id,
            type: node.type || 'main_topic',
            parentNodeId: node.parentNodeId || null,
            prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites : [],
            width: Math.round(node.width || 180),
            height: Math.round(node.height || 58),
        }));

        const byId = new Map(normalized.map((node) => [node.id, node]));
        const parents = normalized
            .filter((node) => node.type === 'main_topic' || !node.parentNodeId)
            .sort((a, b) => a.label.localeCompare(b.label));

        const parentSet = new Set(parents.map((node) => node.id));
        const parentIndegree = new Map(parents.map((node) => [node.id, 0]));
        const parentAdj = new Map(parents.map((node) => [node.id, []]));

        for (const parent of parents) {
            for (const prereqId of parent.prerequisites) {
                if (!parentSet.has(prereqId)) continue;
                parentAdj.get(prereqId).push(parent.id);
                parentIndegree.set(parent.id, (parentIndegree.get(parent.id) || 0) + 1);
            }
        }

        const queue = parents
            .filter((parent) => (parentIndegree.get(parent.id) || 0) === 0)
            .map((parent) => parent.id)
            .sort((a, b) => (byId.get(a)?.label || '').localeCompare(byId.get(b)?.label || ''));

        const orderedParentIds = [];
        while (queue.length > 0) {
            const current = queue.shift();
            orderedParentIds.push(current);

            for (const nextId of parentAdj.get(current) || []) {
                const nextDegree = (parentIndegree.get(nextId) || 0) - 1;
                parentIndegree.set(nextId, nextDegree);
                if (nextDegree === 0) {
                    queue.push(nextId);
                    queue.sort((a, b) => (byId.get(a)?.label || '').localeCompare(byId.get(b)?.label || ''));
                }
            }
        }

        for (const parent of parents) {
            if (!orderedParentIds.includes(parent.id)) {
                orderedParentIds.push(parent.id);
            }
        }

        const childrenByParent = new Map();
        for (const node of normalized) {
            if (!node.parentNodeId || !parentSet.has(node.parentNodeId)) continue;
            const list = childrenByParent.get(node.parentNodeId) || [];
            list.push(node);
            childrenByParent.set(node.parentNodeId, list);
        }

        const orphanNodes = normalized.filter((node) => {
            if (parentSet.has(node.id)) return false;
            return !node.parentNodeId || !parentSet.has(node.parentNodeId);
        });

        const centerX = CENTER_X;
        const rowGapY = 174;
        const topStartY = 80;
        const sideOffset = CHILD_SIDE_GAP;
        const sideStackGap = 82;

        const laidOut = [];

        orderedParentIds.forEach((parentId, rowIndex) => {
            const parent = byId.get(parentId);
            if (!parent) return;

            const parentY = topStartY + rowIndex * rowGapY;
            laidOut.push({
                ...parent,
                x: Math.round(centerX - parent.width / 2),
                y: parentY,
            });

            const children = (childrenByParent.get(parentId) || [])
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label));

            const leftChildren = [];
            const rightChildren = [];
            children.forEach((child, idx) => {
                if (idx % 2 === 0) leftChildren.push(child);
                else rightChildren.push(child);
            });

            const placeSide = (items, side) => {
                const baseY = parentY - Math.round(((items.length - 1) * sideStackGap) / 2);
                items.forEach((child, idx) => {
                    const y = baseY + idx * sideStackGap;
                    // Fixed two columns: left and right are locked regardless of label length.
                    const x = side === 'left'
                        ? Math.round(centerX - sideOffset - CHILD_COLUMN_WIDTH + Math.round((CHILD_COLUMN_WIDTH - child.width) / 2))
                        : Math.round(centerX + sideOffset + Math.round((CHILD_COLUMN_WIDTH - child.width) / 2));

                    laidOut.push({
                        ...child,
                        x,
                        y,
                    });
                });
            };

            placeSide(leftChildren, 'left');
            placeSide(rightChildren, 'right');
        });

        if (orphanNodes.length > 0) {
            const orphanY = topStartY + orderedParentIds.length * rowGapY;
            const gapX = 36;
            const rowWidth = orphanNodes.reduce((sum, node) => sum + node.width, 0) + Math.max(0, orphanNodes.length - 1) * gapX;
            let xCursor = Math.round(centerX - rowWidth / 2);

            for (const node of orphanNodes.sort((a, b) => a.label.localeCompare(b.label))) {
                laidOut.push({
                    ...node,
                    x: xCursor,
                    y: orphanY,
                });
                xCursor += node.width + gapX;
            }
        }

        return laidOut;
    }, [renderedNodes]);

    const nodeById = useMemo(() => {
        return new Map(planeNodes.map((node) => [node.id, node]));
    }, [planeNodes]);

    const derivedEdges = useMemo(() => {
        const merged = [];
        const seen = new Set();

        const pushEdge = (source, target, type) => {
            if (!source || !target || source === target) return;
            if (!nodeById.has(source) || !nodeById.has(target)) return;

            const key = `${source}__${target}__${type}`;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push({ source, target, type });
        };

        const mainParents = planeNodes
            .filter((node) => node.type === 'main_topic' || !node.parentNodeId)
            .sort((a, b) => a.y - b.y || a.x - b.x);

        for (let i = 0; i < mainParents.length - 1; i += 1) {
            pushEdge(mainParents[i].id, mainParents[i + 1].id, 'parent-chain');
        }

        for (const node of planeNodes) {
            pushEdge(node.parentNodeId, node.id, 'parent-child');
            for (const prereq of node.prerequisites || []) {
                pushEdge(prereq, node.id, 'prerequisite');
            }
        }

        for (const edge of edges || []) {
            const type = edge.type === 'dashed' ? 'prerequisite' : 'manual';
            pushEdge(edge.source, edge.target, type);
        }

        return merged;
    }, [planeNodes, edges, nodeById]);

    const parentClusters = useMemo(() => {
        const childByParent = new Map();
        for (const node of planeNodes) {
            if (!node.parentNodeId) continue;
            const list = childByParent.get(node.parentNodeId) || [];
            list.push(node.id);
            childByParent.set(node.parentNodeId, list);
        }

        const clusters = [];
        for (const [parentId, childIds] of childByParent.entries()) {
            const parent = nodeById.get(parentId);
            if (!parent || childIds.length === 0) continue;
            if (parent.type !== 'main_topic') continue;

            const involved = [parentId, ...childIds]
                .map((id) => nodeById.get(id))
                .filter(Boolean);
            if (involved.length === 0) continue;

            let minX = Number.POSITIVE_INFINITY;
            let minY = Number.POSITIVE_INFINITY;
            let maxX = Number.NEGATIVE_INFINITY;
            let maxY = Number.NEGATIVE_INFINITY;

            for (const node of involved) {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x + node.width);
                maxY = Math.max(maxY, node.y + node.height);
            }

            const pad = 18;
            clusters.push({
                parentId,
                label: parent.label,
                x: Math.max(0, minX - pad),
                y: Math.max(0, minY - (pad + 18)),
                width: maxX - minX + pad * 2,
                height: maxY - minY + pad * 2 + 18,
            });
        }

        return clusters;
    }, [planeNodes, nodeById]);

    const visibleEdges = useMemo(() => {
        return derivedEdges.filter((edge) => {
            if (edge.type === 'prerequisite') return false;
            if (edge.type === 'parent-chain') return true;
            if (edge.type === 'parent-child') return true;
            return edge.type === 'manual';
        });
    }, [derivedEdges]);

    const planeBounds = useMemo(() => {
        if (planeNodes.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const node of planeNodes) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        }

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: Math.max(0, maxX - minX),
            height: Math.max(0, maxY - minY),
        };
    }, [planeNodes]);

    const planeSize = useMemo(() => {
        const right = Math.max(1000, planeBounds.maxX + 220);
        const bottom = Math.max(700, planeBounds.maxY + 220);
        return { width: right, height: bottom };
    }, [planeBounds]);

    const centerRoadmap = useCallback((nextZoom = 1) => {
        const viewport = viewportRef.current;
        if (!viewport || planeNodes.length === 0) return;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const contentCenterX = planeBounds.minX + planeBounds.width / 2;
        const contentCenterY = planeBounds.minY + planeBounds.height / 2;

        setPan({
            x: Math.round(viewportWidth / 2 - contentCenterX * nextZoom),
            y: Math.round(viewportHeight / 2 - contentCenterY * nextZoom),
        });
    }, [planeBounds, planeNodes.length]);

    useEffect(() => {
        if (planeNodes.length === 0) return;

        const viewport = viewportRef.current;
        if (!viewport) return;

        const padding = 90;
        const availableWidth = Math.max(240, viewport.clientWidth - padding);
        const availableHeight = Math.max(240, viewport.clientHeight - padding);
        const fitScaleX = planeBounds.width > 0 ? availableWidth / planeBounds.width : 1;
        const fitScaleY = planeBounds.height > 0 ? availableHeight / planeBounds.height : 1;
        const fitScale = Math.min(1.1, Math.max(0.45, Math.min(fitScaleX, fitScaleY)));

        setZoom(fitScale);
        centerRoadmap(fitScale);
    }, [planeNodes, planeBounds, centerRoadmap]);

    const clampZoom = useCallback((value) => {
        return Math.min(2.4, Math.max(0.35, value));
    }, []);

    const zoomBy = useCallback((delta) => {
        setZoom((current) => {
            const next = clampZoom(current + delta);
            if (next === current) return current;
            centerRoadmap(next);
            return next;
        });
    }, [centerRoadmap, clampZoom]);

    const handleWheel = useCallback((event) => {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.1 : -0.1;
        zoomBy(delta);
    }, [zoomBy]);

    const handlePointerDown = useCallback((event) => {
        if (event.button !== 0) return;
        setIsPanning(true);
        panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    }, [pan.x, pan.y]);

    const handlePointerMove = useCallback((event) => {
        if (!isPanning) return;

        const dx = event.clientX - panStartRef.current.x;
        const dy = event.clientY - panStartRef.current.y;
        setPan({
            x: panStartRef.current.panX + dx,
            y: panStartRef.current.panY + dy,
        });
    }, [isPanning]);

    const stopPanning = useCallback(() => {
        setIsPanning(false);
    }, []);

    const resetView = useCallback(() => {
        const baseZoom = 1;
        setZoom(baseZoom);
        centerRoadmap(baseZoom);
    }, [centerRoadmap]);

    return (
        <div className="roadmap-graph-renderer" style={{ width: '100%', height: '100%', minHeight: 420 }}>
            {!loading && planeNodes.length === 0 && (
                <div className="roadmap-graph-renderer__empty">
                    Chua co node de preview. Hay kiem tra YAML va them it nhat 1 node hop le.
                </div>
            )}

            {loading && (
                <div className="roadmap-graph-renderer__loading" role="status" aria-live="polite">
                    <div className="loading-spinner">Dang render roadmap...</div>
                </div>
            )}

            {!loading && planeNodes.length > 0 && (
                <div className="roadmap-graph-renderer__fallback" role="status" aria-live="polite">
                    {controlsVisible ? (
                        <div className="roadmap-graph-renderer__controls">
                            <button type="button" className="roadmap-graph-renderer__control-btn" onClick={() => zoomBy(0.1)}>+</button>
                            <button type="button" className="roadmap-graph-renderer__control-btn" onClick={() => zoomBy(-0.1)}>-</button>
                            <button type="button" className="roadmap-graph-renderer__control-btn" onClick={resetView}>1:1</button>
                            <button type="button" className="roadmap-graph-renderer__control-btn" onClick={() => centerRoadmap(zoom)}>Center</button>
                            <button
                                type="button"
                                className={`roadmap-graph-renderer__control-btn ${showClusters ? 'is-active' : ''}`}
                                onClick={() => setShowClusters((value) => !value)}
                            >
                                Cluster
                            </button>
                        </div>
                    ) : null}

                    <div
                        ref={viewportRef}
                        className="roadmap-graph-renderer__fallback-canvas"
                        onWheel={handleWheel}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={stopPanning}
                        onPointerLeave={stopPanning}
                        onPointerCancel={stopPanning}
                        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                    >
                        <div
                            className="roadmap-graph-renderer__plane"
                            style={{
                                width: `${planeSize.width}px`,
                                height: `${planeSize.height}px`,
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            }}
                        >
                            {showClusters && parentClusters.map((cluster) => (
                                <div
                                    key={`cluster-${cluster.parentId}`}
                                    className="roadmap-graph-renderer__cluster"
                                    style={{
                                        left: `${cluster.x}px`,
                                        top: `${cluster.y}px`,
                                        width: `${cluster.width}px`,
                                        height: `${cluster.height}px`,
                                    }}
                                >
                                    <div className="roadmap-graph-renderer__cluster-label">{cluster.label}</div>
                                </div>
                            ))}

                            <svg
                                className="roadmap-graph-renderer__edges"
                                viewBox={`0 0 ${planeSize.width} ${planeSize.height}`}
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <marker id="arrow-parent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0,0 L8,4 L0,8 Z" fill="#1d4ed8" />
                                    </marker>
                                    <marker id="arrow-child" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
                                    </marker>
                                    <marker id="arrow-manual" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0,0 L8,4 L0,8 Z" fill="#0ea5e9" />
                                    </marker>
                                    <marker id="arrow-prereq" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
                                    </marker>
                                </defs>

                                {visibleEdges.map((edge, index) => {
                                    const source = nodeById.get(edge.source);
                                    const target = nodeById.get(edge.target);
                                    if (!source || !target) return null;

                                    let path = '';
                                    const sourceCenterX = Math.round(source.x + source.width / 2);
                                    const sourceCenterY = Math.round(source.y + source.height / 2);
                                    const targetCenterX = Math.round(target.x + target.width / 2);
                                    const targetCenterY = Math.round(target.y + target.height / 2);

                                    if (edge.type === 'parent-chain') {
                                        const x = sourceCenterX;
                                        const y1 = Math.round(source.y + source.height);
                                        const y2 = Math.round(target.y);
                                        path = `M ${x} ${y1} L ${x} ${y2}`;
                                    } else if (edge.type === 'parent-child') {
                                        const isLeft = targetCenterX < sourceCenterX;
                                        const x1 = isLeft ? Math.round(source.x) : Math.round(source.x + source.width);
                                        const y1 = sourceCenterY;
                                        const x2 = isLeft ? Math.round(target.x + target.width) : Math.round(target.x);
                                        const y2 = targetCenterY;
                                        const midX = isLeft ? Math.min(x1, x2) - 18 : Math.max(x1, x2) + 18;
                                        path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                                    } else {
                                        const x1 = sourceCenterX;
                                        const y1 = Math.round(source.y + source.height);
                                        const x2 = targetCenterX;
                                        const y2 = Math.round(target.y);
                                        const yBreak = y1 + 22;
                                        const yApproach = Math.max(yBreak + 6, y2 - 18);
                                        path = `M ${x1} ${y1} L ${x1} ${yBreak} L ${x2} ${yBreak} L ${x2} ${yApproach} L ${x2} ${y2}`;
                                    }

                                    return (
                                        <path
                                            key={`edge-${index}-${edge.source}-${edge.target}`}
                                            d={path}
                                            className={`roadmap-graph-renderer__edge roadmap-graph-renderer__edge--${edge.type}`}
                                            markerEnd={
                                                edge.type === 'parent-chain'
                                                    ? 'url(#arrow-parent)'
                                                    : edge.type === 'parent-child'
                                                        ? 'url(#arrow-child)'
                                                        : edge.type === 'prerequisite'
                                                            ? 'url(#arrow-prereq)'
                                                            : 'url(#arrow-manual)'
                                            }
                                        />
                                    );
                                })}
                            </svg>

                            {planeNodes.map((node) => (
                                <div
                                    key={node.id}
                                    className={`roadmap-graph-renderer__fallback-node roadmap-graph-renderer__fallback-node--${node.type} ${node.parentNodeId ? 'roadmap-graph-renderer__fallback-node--child' : 'roadmap-graph-renderer__fallback-node--parent'}`}
                                    style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px` }}
                                    title={node.id}
                                    onClick={() => onNodeSelect?.(node.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onNodeSelect?.(node.id);
                                        }
                                    }}
                                >
                                    <div className="roadmap-graph-renderer__fallback-node-title">{node.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoadmapGraphRenderer;
