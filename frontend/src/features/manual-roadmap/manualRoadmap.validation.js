import { load } from 'js-yaml';

/**
 * Parse YAML string → JavaScript Object
 * Hỗ trợ cấu trúc đồ thị: nodes + edges
 * @param {string} yamlCode - YAML input
 * @returns {Object} { title, description, nodes, edges }
 */
export function parseManualRoadmapYaml(yamlCode) {
    if (typeof yamlCode !== 'string') {
        throw new Error('YAML input must be a string.');
    }

    if (yamlCode.trim().length === 0) {
        throw new Error('Enter roadmap YAML to preview.');
    }

    if (yamlCode.length > 10240) {
        throw new Error('YAML content exceeds the 10KB limit.');
    }

    let parsed;
    try {
        parsed = load(yamlCode);
    } catch (err) {
        throw new Error(`YAML syntax error at line ${err.mark?.line + 1}: ${err.message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Parsed YAML must be an object with title and nodes.');
    }

    const title = String(parsed.title || '').trim();
    if (!title) {
        throw new Error('Roadmap title is required.');
    }

    const description = String(parsed.description || '').trim();
    const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    if (rawNodes.length === 0) {
        throw new Error('At least one node is required.');
    }

    // Parse nodes
    const nodes = rawNodes.map((node, idx) => {
        if (!node || typeof node !== 'object') {
            throw new Error(`Each roadmap node must be an object (error at node ${idx}).`);
        }

        const nodeId = String(node.nodeId || node.id || '').trim();
        if (!nodeId) {
            throw new Error(`Node at index ${idx}: must have "nodeId" or "id" field.`);
        }

        const label = String(node.label || '').trim();
        if (!label) {
            throw new Error(`Node "${nodeId}": must have "label" field.`);
        }

        const legacySkills = Array.isArray(node.skills)
            ? node.skills.map(skill => String(skill || '').trim()).filter(Boolean)
            : [];

        const skillName = String(node.skillName || legacySkills[0] || '').trim();

        // Parse type (main_topic, sub_topic, group_container)
        const type = ['main_topic', 'sub_topic', 'group_container', 'choice_item'].includes(node.type)
            ? node.type
            : 'main_topic';

        // Parent relationship (explicit, not inferred from prerequisites)
        const parentNodeId = String(node.parentNodeId || node.parent || '').trim() || null;

        // Prerequisites (for semantic meaning, but not used for layout)
        const prerequisites = Array.isArray(node.prerequisites)
            ? node.prerequisites.map(id => String(id || '').trim()).filter(Boolean)
            : [];

        // ELK.js layout options
        const elkOptions = typeof node.elkOptions === 'object' && node.elkOptions !== null
            ? node.elkOptions
            : {};

        return {
            nodeId,
            type,
            label,
            description: String(node.description || node.reason || '').trim(),
            parentNodeId,
            prerequisites,
            skillName,
            skills: skillName ? [skillName] : [],
            elkOptions,
            resources: Array.isArray(node.resources) ? node.resources : [],
            metadata: typeof node.metadata === 'object' && node.metadata !== null ? node.metadata : {},
        };
    });

    // Parse edges (if explicitly provided in YAML) or return empty array
    // Backend will generate edges from parentNodeId relationships
    let edges = [];
    if (Array.isArray(parsed.edges)) {
        edges = parsed.edges.map((edge, idx) => {
            if (!edge.id || !edge.source || !edge.target) {
                throw new Error(`Edge at index ${idx}: must have "id", "source", and "target" fields.`);
            }
            return {
                edgeId: String(edge.id).trim(),
                source: String(edge.source).trim(),
                target: String(edge.target).trim(),
                type: edge.type || 'default',
            };
        });
    }

    return {
        title,
        description,
        nodes,
        edges,
    };
}
