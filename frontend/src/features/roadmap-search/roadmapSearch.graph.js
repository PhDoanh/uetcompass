export function buildRoadmapPreviewGraph(nodes = []) {
    const nodeMap = new Map();
    const flowNodes = [];
    const flowEdges = [];

    (nodes || []).forEach((node, index) => {
        const id = String(node.nodeId || node.id || index);
        nodeMap.set(id, index);
        flowNodes.push({
            id,
            data: { label: node.label || id },
            position: { x: 120 * index, y: (index % 4) * 120 },
            style: {
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 600,
                padding: '6px 10px',
            },
        });
    });

    (nodes || []).forEach((node) => {
        const source = String(node.nodeId || node.id || '');
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
}
