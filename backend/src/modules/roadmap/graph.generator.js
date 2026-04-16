'use strict';

/**
 * Graph Generator Service
 * Mục đích: Convert node hierarchy → edges array
 * Input: Arrays of nodes (có parentNodeId, prerequisites)
 * Output: Edges array cho ELK.js + ReactFlow
 */

/**
 * Tạo edges từ node relationships
 * @param {Array} nodes - Mảng nodes từ YAML parser
 * @param {Object} options - Configuration
 * @returns {Array} Edges array
 */
function generateEdgesFromHierarchy(nodes, options = {}) {
    const {
        includePrerequisites = true,
        deduplicateEdges = true,
    } = options;

    const edges = [];
    const edgeSet = new Set();  // Track created edges (avoid duplicates)

    nodes.forEach((node) => {
        // Edge 1: Parent → Child relationship (explicit parentNodeId)
        if (node.parentNodeId) {
            const edgeId = `e_${node.parentNodeId}_to_${node.nodeId}`;

            if (!edgeSet.has(edgeId)) {
                edges.push({
                    edgeId,
                    source: node.parentNodeId,
                    target: node.nodeId,
                    type: 'default',  // Solid edges for parent-child
                });
                edgeSet.add(edgeId);
            }
        }

        // Edge 2: Prerequisite relationships (nếu enabled)
        if (includePrerequisites && Array.isArray(node.prerequisites)) {
            node.prerequisites.forEach((prereqNodeId) => {
                const edgeId = `e_${prereqNodeId}_prereq_to_${node.nodeId}`;

                if (!edgeSet.has(edgeId)) {
                    edges.push({
                        edgeId,
                        source: prereqNodeId,
                        target: node.nodeId,
                        type: 'dashed',  // Dashed edges for prerequisites
                    });
                    edgeSet.add(edgeId);
                }
            });
        }
    });

    return edges;
}

/**
 * Validate node hierarchy (check for circular dependencies)
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Object} { isValid, errors }
 */
function validateHierarchy(nodes, edges) {
    const errors = [];
    const nodeIds = new Set(nodes.map(n => n.nodeId));

    // Check 1: All referenced nodes exist
    edges.forEach((edge) => {
        if (!nodeIds.has(edge.source)) {
            errors.push(`Edge ${edge.edgeId}: source node "${edge.source}" not found`);
        }
        if (!nodeIds.has(edge.target)) {
            errors.push(`Edge ${edge.edgeId}: target node "${edge.target}" not found`);
        }
    });

    // Check 2: Detect circular dependencies (simple cycle detection)
    const adjList = {};
    nodes.forEach(n => { adjList[n.nodeId] = []; });
    edges.forEach(e => {
        if (adjList[e.source]) {
            adjList[e.source].push(e.target);
        }
    });

    function hasCycle(nodeId, visited = new Set(), recursionStack = new Set()) {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        for (const neighbor of adjList[nodeId] || []) {
            if (!visited.has(neighbor)) {
                if (hasCycle(neighbor, visited, recursionStack)) {
                    return true;
                }
            } else if (recursionStack.has(neighbor)) {
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    const visited = new Set();
    for (const nodeId of nodeIds) {
        if (!visited.has(nodeId)) {
            if (hasCycle(nodeId, visited, new Set())) {
                errors.push(`Circular dependency detected involving node "${nodeId}"`);
                break;  // Stop after finding first cycle
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Enrich nodes with default values
 * @param {Array} nodes - Parsed nodes from YAML
 * @returns {Array} Enriched nodes
 */
function enrichNodes(nodes) {
    return nodes.map((node) => ({
        ...node,
        type: node.type || 'main_topic',
        parentNodeId: node.parentNodeId || null,
        prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites : [],
        roadmapName: String(node.roadmapName || node.label || '').trim(),
        skillName: String(node.skillName || '').trim(),
        elkOptions: node.elkOptions || {
            // Default ELK layout options
            width: node.type === 'main_topic' ? 220 : 160,
            height: node.type === 'main_topic' ? 80 : 60,
        },
    }));
}

/**
 * Topological sort nodes by dependencies
 * Useful for sequential rendering or processing
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Array} Sorted nodes
 */
function topologicalSort(nodes, edges) {
    const adjList = {};
    const inDegree = {};

    nodes.forEach(n => {
        adjList[n.nodeId] = [];
        inDegree[n.nodeId] = 0;
    });

    edges.forEach(e => {
        adjList[e.source].push(e.target);
        inDegree[e.target]++;
    });

    const queue = [];
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.nodeId] = n; });

    // Find all nodes with no incoming edges
    for (const nodeId of Object.keys(inDegree)) {
        if (inDegree[nodeId] === 0) {
            queue.push(nodeId);
        }
    }

    const sorted = [];
    while (queue.length > 0) {
        const nodeId = queue.shift();
        sorted.push(nodeMap[nodeId]);

        for (const neighbor of adjList[nodeId]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    return sorted;
}

module.exports = {
    generateEdgesFromHierarchy,
    validateHierarchy,
    enrichNodes,
    topologicalSort,
};
