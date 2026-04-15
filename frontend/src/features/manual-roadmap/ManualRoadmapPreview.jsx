import React, { useMemo } from 'react';
import '../skill-tree/skill-tree.css';
import './manual-roadmap.css';

function chunk(items, size) {
    const output = [];
    for (let index = 0; index < items.length; index += size) {
        output.push(items.slice(index, index + size));
    }
    return output;
}

const TOPIC_NODE_WIDTH = 260;
const TOPIC_LINK_WIDTH = 104;
const CONNECTOR_BASE_DROP = 28;
const CONNECTOR_ROW_STEP = 64;
const CONNECTOR_EXTRA_TO_NEXT_ROW = 144;

function getRowWidth(topicCount) {
    if (!topicCount) return 0;
    return topicCount * TOPIC_NODE_WIDTH + (topicCount - 1) * TOPIC_LINK_WIDTH;
}

function getStatusClass(status) {
    if (status === 'done' || status === 'completed') return 'node-color-done';
    if (status === 'in_progress' || status === 'inProgress') return 'node-color-progress';
    if (status === 'locked' || status === 'skip') return 'node-color-skip';
    return 'node-color-neutral';
}

function getStatusLabel(status) {
    if (status === 'done' || status === 'completed') return 'Completed';
    if (status === 'in_progress' || status === 'inProgress') return 'In progress';
    if (status === 'locked' || status === 'skip') return 'Locked';
    return 'Pending';
}

export default function ManualRoadmapPreview({ nodes = [], selectedNodeId, onNodeSelect }) {
    // Organize nodes into parent and children groups
    const { parentNodes, childrenByParent } = useMemo(() => {
        const nodeIdSet = new Set(nodes.map((node) => node.nodeId));
        const parents = [];
        const childMap = {};

        nodes.forEach((node) => {
            const parentId = String(node.parent || '').trim();

            // Treat missing/invalid parent references as root nodes
            if (!parentId || !nodeIdSet.has(parentId)) {
                parents.push(node);
            } else {
                if (!childMap[parentId]) {
                    childMap[parentId] = [];
                }
                childMap[parentId].push(node);
            }
        });

        return {
            parentNodes: parents,
            childrenByParent: childMap,
        };
    }, [nodes]);

    const parentRows = useMemo(() => chunk(parentNodes, 3), [parentNodes]);

    if (!Array.isArray(nodes) || nodes.length === 0) {
        return (
            <div className="skill-tree-empty-state">
                <p>No nodes to preview yet.</p>
            </div>
        );
    }

    const renderNodeButton = (node, isChild = false) => {
        const isSelected = node.nodeId === selectedNodeId;
        const resourceCount = Array.isArray(node.resources) ? node.resources.length : 0;
        const prereqCount = Array.isArray(node.prerequisites) ? node.prerequisites.length : 0;

        return (
            <button
                type="button"
                onClick={() => onNodeSelect?.(node.nodeId)}
                className={`course-node roadmap-node ${isChild ? 'roadmap-node--child' : 'roadmap-node--parent'} ${getStatusClass(node.status)} ${isSelected ? 'manual-roadmap-preview__node--selected' : ''}`}
                style={isSelected ? {
                    borderColor: '#2563eb',
                    boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.16), 0 14px 26px rgba(17, 28, 42, 0.2)',
                    background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
                } : undefined}
            >
                <div className="course-node__main">
                    <div className="course-node__text">
                        <h3 className="course-node__code">{node.label || node.nodeId}</h3>
                        <p className="course-node__name-en">{node.nodeId}</p>
                    </div>
                </div>
                <div className="course-node__credits">
                    {getStatusLabel(node.status)} · {prereqCount} prereq{prereqCount === 1 ? '' : 's'} · {resourceCount} resource{resourceCount === 1 ? '' : 's'}
                </div>
            </button>
        );
    };

    const renderChildren = (parentNodeId, level = 1, ancestorSet = new Set()) => {
        const children = childrenByParent[parentNodeId] || [];
        if (children.length === 0) {
            return null;
        }

        return (
            <div className="skill-tree-roadmap-v2__chips" data-depth={level}>
                {children.map((childNode) => {
                    // Guard against malformed cyclic parent links
                    if (ancestorSet.has(childNode.nodeId)) {
                        return null;
                    }

                    const nextAncestors = new Set(ancestorSet);
                    nextAncestors.add(childNode.nodeId);

                    return (
                        <div key={childNode.nodeId} className="skill-tree-roadmap-v2__chip-wrap">
                            <div className="skill-tree-roadmap-v2__chip-line" aria-hidden="true" />
                            {renderNodeButton(childNode, true)}
                            {renderChildren(childNode.nodeId, level + 1, nextAncestors)}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="skill-tree-canvas skill-canvas manual-roadmap-preview" role="list" aria-label="Manual roadmap preview">
            <div className="skill-tree-roadmap-v2">
                {parentRows.map((parentRow, rowIndex) => {
                    const isReverseRow = rowIndex % 2 === 1;
                    const displayRow = isReverseRow ? [...parentRow].reverse() : parentRow;
                    const hasNextRow = rowIndex < parentRows.length - 1;
                    const nextRow = hasNextRow ? parentRows[rowIndex + 1] : [];
                    const nextDisplayRow = (rowIndex + 1) % 2 === 1 ? [...nextRow].reverse() : nextRow;

                    // Calculate max children in this row to determine connector drop height
                    const maxChildrenInRow = Math.max(
                        0,
                        ...displayRow.map((parent) => (childrenByParent[parent.nodeId] || []).length)
                    );
                    const connectorDrop =
                        CONNECTOR_BASE_DROP +
                        maxChildrenInRow * CONNECTOR_ROW_STEP +
                        CONNECTOR_EXTRA_TO_NEXT_ROW;

                    const currentHalf = getRowWidth(displayRow.length) / 2;
                    const nextHalf = getRowWidth(nextDisplayRow.length) / 2;

                    return (
                        <section
                            className={`skill-tree-roadmap-v2__row-block ${hasNextRow ? 'skill-tree-roadmap-v2__row-block--with-connector' : ''}`}
                            key={`parent-row-${rowIndex}`}
                            style={hasNextRow ? {
                                '--connector-drop': `${connectorDrop}px`,
                                '--current-half': `${currentHalf}px`,
                                '--next-half': `${nextHalf}px`,
                            } : undefined}
                        >
                            <div className="skill-tree-roadmap-v2__row">
                                {displayRow.map((parentNode, parentIndex) => (
                                    <React.Fragment key={parentNode.nodeId}>
                                        <div className="skill-tree-roadmap-v2__cell">
                                            {renderNodeButton(parentNode, false)}

                                            {renderChildren(parentNode.nodeId, 1, new Set([parentNode.nodeId]))}
                                        </div>

                                        {parentIndex < displayRow.length - 1 && (
                                            <div
                                                className={`skill-tree-roadmap-v2__topic-link ${isReverseRow ? 'skill-tree-roadmap-v2__topic-link--left' : 'skill-tree-roadmap-v2__topic-link--right'}`}
                                                aria-hidden="true"
                                            >
                                                <div className="skill-tree-roadmap-v2__topic-link-line" />
                                                <div className="skill-tree-roadmap-v2__topic-link-arrow" />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {hasNextRow && (
                                <div
                                    className={`skill-tree-roadmap-v2__row-connector ${isReverseRow ? 'skill-tree-roadmap-v2__row-connector--left' : 'skill-tree-roadmap-v2__row-connector--right'}`}
                                    aria-hidden="true"
                                >
                                    <div className="skill-tree-roadmap-v2__row-connector-out" />
                                    <div className="skill-tree-roadmap-v2__row-connector-down" />
                                    <div className="skill-tree-roadmap-v2__row-connector-in" />
                                    <div className="skill-tree-roadmap-v2__row-connector-arrow" />
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
