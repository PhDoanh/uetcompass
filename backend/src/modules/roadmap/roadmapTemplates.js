'use strict';

/**
 * In-memory template roadmaps loaded from backend/data/*.json.
 * These appear in the community listing as "shared by UETCompass"
 * without being persisted to MongoDB.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { generateEdgesFromHierarchy } = require('./graph.generator');
const { buildManualRoadmapYaml } = require('./roadmapYaml.service');

const DATA_DIR = path.join(__dirname, '../../..', 'data');

/** Deterministic 24-char hex ID derived from roadmapName */
function stableId(roadmapName) {
    return crypto.createHash('md5').update(roadmapName).digest('hex').slice(0, 24);
}

function mapNodeType(nodeType) {
    if (nodeType === 'topic') return 'main_topic';
    if (nodeType === 'subtopic') return 'sub_topic';
    return 'main_topic';
}

function convertNode(n) {
    return {
        nodeId: String(n.nodeId || '').trim(),
        type: mapNodeType(n.nodeType),
        label: String(n.skillName || n.label || '').trim(),
        description: String(n.reason || n.description || '').trim().slice(0, 300),
        parentNodeId: n.parentNodeId || null,
        prerequisites: Array.isArray(n.prerequisites) ? n.prerequisites : [],
        resources: Array.isArray(n.resources) ? n.resources : [],
        skillName: String(n.skillName || '').trim(),
        elkOptions: {},
    };
}

// Loaded once on first access
let _cache = null;

function loadTemplates() {
    if (_cache) return _cache;
    _cache = [];

    let files;
    try {
        files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    } catch {
        return _cache;
    }

    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
            const title = String(data.roadmapName || '').trim();
            if (!title || !Array.isArray(data.nodes) || data.nodes.length === 0) continue;

            const nodes = data.nodes.map(convertNode).filter((n) => n.nodeId && n.label);
            if (nodes.length === 0) continue;

            const edges = generateEdgesFromHierarchy(nodes, { includePrerequisites: true });
            const description = `Official ${title} roadmap curated by UETCompass.`;
            const yamlCode = buildManualRoadmapYaml({ title, description, nodes });

            _cache.push({
                _id: stableId(title),
                title,
                description,
                yamlCode,
                nodes,
                edges,
                tags: [],
                isPublic: true,
                isPrimary: false,
                shared: true,
                sharedAt: new Date('2026-01-01T00:00:00Z'),
                averageRating: null,
                nodeCount: nodes.length,
                ownerName: 'UETCompass',
                ownerAvatar: null,
            });
        } catch {
            // skip malformed files
        }
    }

    return _cache;
}

/** All templates, optionally filtered by title query (case-insensitive) */
function getAll({ q = '' } = {}) {
    const templates = loadTemplates();
    if (!q) return templates;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return templates.filter((t) => re.test(t.title));
}

/** Find a single template by its stable ID */
function getById(id) {
    return loadTemplates().find((t) => t._id === id) || null;
}

module.exports = { getAll, getById };
