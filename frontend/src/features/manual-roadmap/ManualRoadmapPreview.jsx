import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function ManualRoadmapPreview({ nodes, selectedNodeId, onNodeSelect }) {
    const { flowNodes, flowEdges } = useMemo(() => {
        const nodeMap = new Map();
        const flowNodes = [];
        const flowEdges = [];

        nodes.forEach((node, index) => {
            const id = node.nodeId;
            nodeMap.set(id, index);
            const isSelected = id === selectedNodeId;
            flowNodes.push({
                id,
                data: { label: node.label || id },
                position: { x: 120 * index, y: (index % 4) * 120 },
                style: {
                    borderRadius: 10,
                    border: isSelected ? '2px solid #0055A2' : '1px solid #cbd5e1',
                    background: isSelected ? '#e0f2fe' : '#ffffff',
                    color: '#0f172a',
                    fontWeight: isSelected ? 700 : 500,
                    padding: '6px 10px',
                    boxShadow: isSelected ? '0 0 0 2px rgba(14, 116, 144, 0.15)' : 'none',
                },
            });
        });

        nodes.forEach((node) => {
            const source = node.nodeId;
            for (const prereq of node.prerequisites || []) {
                if (nodeMap.has(prereq)) {
                    flowEdges.push({
                        id: `${prereq}->${source}`,
                        source: prereq,
                        target: source,
                        type: 'straight',
                        animated: true,
                    });
                }
            }
        });

        return { flowNodes, flowEdges };
    }, [nodes, selectedNodeId]);

    if (!Array.isArray(nodes) || nodes.length === 0) {
        return <p style={{ color: '#555' }}>No nodes to preview yet.</p>;
    }

    return (
        <div style={{ width: '100%', height: '100%', minHeight: 560, borderRadius: 16, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                fitView
                defaultEdgeOptions={{ type: 'straight' }}
                attributionPosition="bottom-left"
                onNodeClick={(_, node) => onNodeSelect?.(node.id)}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}
