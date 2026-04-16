/**
 * ELK.js Layout Engine for Roadmap Graphs
 * 
 * Purpose: Take parsed nodes + edges, compute x/y positions
 * using ELK's layered layout algorithm
 * 
 * Installation: npm install elkjs
 */

/**
 * Compute positions for nodes using ELK.js
 * @param {Array} nodes - from parseManualRoadmapYaml()
 * @param {Array} edges - from parseManualRoadmapYaml()
 * @param {Object} config - layout configuration
 * @returns {Promise<Object>} positions: { [nodeId]: { x, y, width, height } }
 */
export async function computeLayout(nodes, edges, config = {}) {
    // Dynamic import to avoid issues in non-browser environments
    const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
    const elk = new ELK();

    const {
        algorithm = 'layered',
        direction = 'RIGHT',
        nodeSpacing = 40,
        rankSpacing = 80,
        edgeRouting = 'orthogonal',
    } = config;

    // Map nodes to ELK format
    const elkChildren = nodes.map(node => ({
        id: node.nodeId,
        width: node.elkOptions?.width || (node.type === 'main_topic' ? 220 : 160),
        height: node.elkOptions?.height || (node.type === 'main_topic' ? 80 : 60),
        layoutOptions: {
            ...node.elkOptions,
            'elk.port.side': 'SOUTH',
        },
    }));

    // Map edges to ELK format
    const elkEdges = edges.map(edge => ({
        id: edge.edgeId,
        sources: [edge.source],
        targets: [edge.target],
        type: edge.type,
    }));

    // Build ELK graph structure
    const graph = {
        id: 'roadmap-root',
        layoutOptions: {
            'elk.algorithm': algorithm,
            'elk.direction': direction,
            'elk.spacing.nodeNode': nodeSpacing,
            'elk.spacing.edgeNode': 20,
            'elk.layered.spacing.edgeEdgeBetweenLayers': rankSpacing,
            'elk.edge.type': edgeRouting,
            'elk.layered.nodePlacement.strategy': 'NODE_PROMOTION',
        },
        children: elkChildren,
        edges: elkEdges,
    };

    try {
        // Run layout algorithm
        const layout = await elk.layout(graph);

        // Extract positions from ELK output
        const positions = {};
        if (layout.children) {
            layout.children.forEach(elkNode => {
                positions[elkNode.id] = {
                    x: Math.round(elkNode.x || 0),
                    y: Math.round(elkNode.y || 0),
                    width: elkNode.width,
                    height: elkNode.height,
                };
            });
        }

        return positions;
    } catch (err) {
        console.error('ELK Layout computation error:', err);
        throw new Error(`Failed to compute layout: ${err.message}`);
    }
}

/**
 * Generate fallback positions if ELK computation fails
 * Simple grid layout as fallback
 * @param {Array} nodes - Array of nodes
 * @returns {Object} positions with fallback grid coordinates
 */
export function generateFallbackPositions(nodes) {
    const positions = {};
    const nodesPerRow = 3;
    const colWidth = 280;
    const rowHeight = 150;

    nodes.forEach((node, idx) => {
        const row = Math.floor(idx / nodesPerRow);
        const col = idx % nodesPerRow;

        positions[node.nodeId] = {
            x: col * colWidth,
            y: row * rowHeight,
            width: node.elkOptions?.width || (node.type === 'main_topic' ? 220 : 160),
            height: node.elkOptions?.height || (node.type === 'main_topic' ? 80 : 60),
        };
    });

    return positions;
}

/**
 * Wrapper function with error handling and fallback
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Object} config
 * @param {Boolean} useFallback - use grid fallback on error
 * @returns {Promise<Object>} positions (ELK or fallback)
 */
export async function computeLayoutSafe(nodes, edges, config = {}, useFallback = true) {
    try {
        return await computeLayout(nodes, edges, config);
    } catch (err) {
        console.warn('ELK layout failed, using fallback grid:', err);
        if (useFallback) {
            return generateFallbackPositions(nodes);
        }
        throw err;
    }
}
