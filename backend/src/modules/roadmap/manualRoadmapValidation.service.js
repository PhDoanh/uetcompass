'use strict';

const { load } = require('js-yaml');
const Ajv = require('ajv');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');

const ajv = new Ajv({ allErrors: true, strict: false });

const roadmapSchema = {
    type: 'object',
    properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 1000 },
        edges: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', minLength: 1 },
                    edgeId: { type: 'string', minLength: 1 },
                    source: { type: 'string', minLength: 1 },
                    target: { type: 'string', minLength: 1 },
                    type: { type: 'string', enum: ['default', 'dashed', 'smoothstep'] },
                },
                anyOf: [
                    { required: ['id'] },
                    { required: ['edgeId'] },
                ],
                required: ['source', 'target'],
                additionalProperties: false,
            },
        },
        nodes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', minLength: 1 },
                    nodeId: { type: 'string', minLength: 1 },
                    type: { type: 'string', enum: ['main_topic', 'sub_topic', 'group_container', 'choice_item'] },
                    parentNodeId: { type: ['string', 'null'], minLength: 1 },
                    parent: { type: ['string', 'null'], minLength: 1 },
                    label: { type: 'string', minLength: 1 },
                    description: { type: 'string' },
                    prerequisites: {
                        type: 'array',
                        items: { type: 'string', minLength: 1 },
                        uniqueItems: true,
                    },
                    status: { type: 'string', enum: ['locked', 'pending', 'in_progress', 'done'] },
                    skillName: { type: 'string', minLength: 1 },
                    skills: {
                        type: 'array',
                        items: { type: 'string', minLength: 1 },
                    },
                    resources: {
                        type: 'array',
                        items: {},
                    },
                    elkOptions: { type: 'object' },
                    metadata: { type: 'object' },
                },
                anyOf: [
                    { required: ['label'] },
                ],
                additionalProperties: false,
            },
            minItems: 1,
        },
    },
    required: ['title', 'nodes'],
    additionalProperties: false,
};

const validate = ajv.compile(roadmapSchema);

function normalizeNode(node) {
    if (!node || typeof node !== 'object') return null;
    const nodeId = String(node.nodeId || node.id || '').trim();
    const metadata = typeof node.metadata === 'object' && node.metadata !== null ? node.metadata : {};
    const parentNodeId = String(node.parentNodeId || node.parent || metadata.parentNodeId || '').trim();
    const type = ['main_topic', 'sub_topic', 'group_container', 'choice_item'].includes(node.type)
        ? node.type
        : 'main_topic';
    const label = String(node.label || '').trim();
    const legacySkills = Array.isArray(node.skills) ? node.skills.map(String).map((skill) => skill.trim()).filter(Boolean) : [];
    const skillName = String(node.skillName || legacySkills[0] || '').trim();
    return {
        nodeId,
        type,
        parentNodeId: parentNodeId || null,
        label,
        description: String(node.description || '').trim(),
        prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites.map(String).map((id) => id.trim()).filter(Boolean) : [],
        status: ['locked', 'pending', 'in_progress', 'done'].includes(node.status) ? node.status : 'pending',
        elkOptions: typeof node.elkOptions === 'object' && node.elkOptions !== null && !Array.isArray(node.elkOptions)
            ? node.elkOptions
            : {},
        skillName,
        skills: skillName ? [skillName] : [],
        resources: Array.isArray(node.resources) ? node.resources : [],
        metadata,
    };
}

function detectCycle(nodes) {
    const graph = new Map();
    for (const node of nodes) {
        graph.set(node.nodeId, new Set(node.prerequisites || []));
    }

    const visited = new Set();
    const stack = new Set();

    function visit(nodeId) {
        if (stack.has(nodeId)) {
            return true;
        }
        if (visited.has(nodeId)) {
            return false;
        }
        visited.add(nodeId);
        stack.add(nodeId);
        const parents = graph.get(nodeId) || new Set();
        for (const parent of parents) {
            if (!graph.has(parent)) {
                continue;
            }
            if (visit(parent)) {
                return true;
            }
        }
        stack.delete(nodeId);
        return false;
    }

    for (const nodeId of graph.keys()) {
        if (visit(nodeId)) {
            return true;
        }
    }
    return false;
}

function topologicalSort(nodes) {
    const graph = new Map();
    const inDegree = new Map();

    nodes.forEach((node) => {
        graph.set(node.nodeId, new Set(node.prerequisites || []));
        inDegree.set(node.nodeId, 0);
    });

    for (const node of nodes) {
        for (const prereq of node.prerequisites) {
            if (!inDegree.has(prereq)) continue;
            inDegree.set(prereq, inDegree.get(prereq) + 1);
        }
    }

    const queue = [];
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree === 0) queue.push(nodeId);
    }

    const ordered = [];
    while (queue.length > 0) {
        const next = queue.shift();
        ordered.push(next);
        for (const [nodeId, prereqs] of graph.entries()) {
            if (prereqs.has(next)) {
                prereqs.delete(next);
                inDegree.set(nodeId, inDegree.get(nodeId) - 1);
                if (inDegree.get(nodeId) === 0) {
                    queue.push(nodeId);
                }
            }
        }
    }

    if (ordered.length !== nodes.length) {
        return nodes;
    }

    const nodeById = new Map(nodes.map((node) => [node.nodeId, node]));
    return ordered.map((nodeId) => nodeById.get(nodeId));
}

function getValidationDetails(errors) {
    if (!Array.isArray(errors)) return [];
    return errors.map((error) => {
        const field = error.instancePath ? `${error.instancePath}` : 'value';
        return `${field} ${error.message}`.trim();
    });
}

function validateManualRoadmapYaml(yamlCode) {
    if (typeof yamlCode !== 'string') {
        throw new RoadmapError(400, ERROR_CODES.VALIDATION_ERROR, 'YAML content must be a string.');
    }

    if (yamlCode.length > 10240) {
        throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, 'YAML content exceeds the 10KB size limit.');
    }

    let parsed;
    try {
        parsed = load(yamlCode);
    } catch (error) {
        throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, `YAML syntax error: ${error.message}`);
    }

    if (parsed === null || typeof parsed !== 'object') {
        throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, 'YAML must represent an object with a title and node list.');
    }

    const valid = validate(parsed);
    if (!valid) {
        throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, 'Roadmap validation failed.', getValidationDetails(validate.errors));
    }

    const nodes = parsed.nodes.map(normalizeNode);
    const nodeIds = new Set();

    for (const node of nodes) {
        if (!node.nodeId) {
            throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, 'Every roadmap node must include an id or nodeId.');
        }
        if (nodeIds.has(node.nodeId)) {
            throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, `Duplicate nodeId '${node.nodeId}' detected.`);
        }
        nodeIds.add(node.nodeId);
    }

    const unknownPrereqs = new Set();
    for (const node of nodes) {
        for (const prereq of node.prerequisites) {
            if (!nodeIds.has(prereq)) {
                unknownPrereqs.add(prereq);
            }
        }
    }

    if (unknownPrereqs.size > 0) {
        throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, `Unknown prerequisites referenced: ${Array.from(unknownPrereqs).join(', ')}`);
    }

    if (detectCycle(nodes)) {
        throw new RoadmapError(422, ERROR_CODES.VALIDATION_ERROR, 'Roadmap contains a cycle. Dependencies must form a directed acyclic graph (DAG).');
    }

    const normalizedNodes = topologicalSort(nodes);

    return {
        title: String(parsed.title).trim(),
        description: String(parsed.description || '').trim(),
        nodes: normalizedNodes,
    };
}

module.exports = {
    validateManualRoadmapYaml,
};