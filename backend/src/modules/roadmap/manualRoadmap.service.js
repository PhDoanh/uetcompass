'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');
const { RoadmapProgress } = require('./roadmapProgress.model');
const { RoadmapHistory } = require('./roadmapHistory.model');
const RoadmapProgressCache = require('../progress/roadmapProgressCache.model');
const RoadmapProgressActivity = require('../progress/roadmapProgressActivity.model');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');
const roadmapVersionService = require('./roadmapVersion.service');
const { generateEdgesFromHierarchy, enrichNodes, validateHierarchy } = require('./graph.generator');

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listPublic({ q = '', tags = [], userId = '', page = 1, limit = 20 } = {}) {
    limit = Math.min(limit, 100);
    const filter = { isPublic: true };

    const normalizedUserId = String(userId || '').trim();
    if (normalizedUserId) {
        filter.userId = normalizedUserId;
    }

    const normalizedQuery = String(q || '').trim();
    if (normalizedQuery) {
        filter.title = { $regex: escapeRegex(normalizedQuery), $options: 'i' };
    }

    if (Array.isArray(tags) && tags.length > 0) {
        const normalizedTags = tags.map(t => String(t || '').trim().toLowerCase()).filter(Boolean);
        if (normalizedTags.length > 0) {
            filter['tags.normalizedLabel'] = { $in: normalizedTags };
        }
    }

    const [items, total] = await Promise.all([
        ManualRoadmap.find(filter, { yamlCode: 0, nodes: 0, edges: 0 })
            .sort({ sharedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ManualRoadmap.countDocuments(filter),
    ]);

    return { items, pagination: { page, limit, total } };
}

async function getPublicPreviewById(roadmapId) {
    return ManualRoadmap.findOne(
        { _id: roadmapId },
        { title: 1, description: 1, nodes: 1, edges: 1, yamlCode: 1, sharedAt: 1 }
    ).lean();
}

/**
 * Fetch roadmap for EDITING (include yamlCode)
 * Editor will re-parse YAML if user modifies it
 */
async function getByIdForEdit(roadmapId, userId) {
    return ManualRoadmap.findOne(
        { _id: roadmapId, userId },
        { yamlCode: 1, title: 1, description: 1, status: 1 }
    ).lean();
}

/**
 * Fetch roadmap for VIEWING (include parsed nodes + edges, no yamlCode)
 * Frontend will use nodes/edges directly with ELK.js layout
 */
async function getByIdForView(roadmapId, userId) {
    return ManualRoadmap.findOne(
        { _id: roadmapId, userId },
        { title: 1, description: 1, nodes: 1, edges: 1, positions: 1 }
    ).lean();
}

/**
 * Legacy method for backward compatibility
 */
async function getByIdForUser(roadmapId, userId) {
    return getByIdForEdit(roadmapId, userId);
}

async function listByUser(userId, { page = 1, limit = 20 } = {}) {
    limit = Math.min(limit, 100);
    const filter = { userId };

    const [items, total] = await Promise.all([
        ManualRoadmap.find(filter, { yamlCode: 0, nodes: 0, edges: 0 })
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ManualRoadmap.countDocuments(filter),
    ]);

    return { items, pagination: { page, limit, total } };
}

async function createDraft(userId, { title, description, yamlCode, nodes, tags = [] }) {
    // Enrich nodes with defaults
    const enrichedNodes = enrichNodes(nodes);

    // Generate edges from parent relationships
    const edges = generateEdgesFromHierarchy(enrichedNodes, {
        includePrerequisites: true,
        deduplicateEdges: true,
    });

    // Validate hierarchy (check for circular dependencies, missing nodes)
    const validation = validateHierarchy(enrichedNodes, edges);
    if (!validation.isValid) {
        throw new RoadmapError(400, ERROR_CODES.INVALID_DATA, `Hierarchy validation failed: ${validation.errors.join('; ')}`);
    }

    const manualRoadmap = await ManualRoadmap.create({
        userId,
        title,
        description,
        yamlCode,
        nodes: enrichedNodes,
        edges,
        tags: Array.isArray(tags) ? tags : [],
        shared: true,
        isPublic: true,
        status: 'draft',
        sharedAt: new Date(),
    });

    // Record initial version snapshot (best-effort — does not fail the create)
    roadmapVersionService.createVersion(manualRoadmap._id, manualRoadmap.yamlCode).catch(() => {});

    return typeof manualRoadmap.toObject === 'function' ? manualRoadmap.toObject() : manualRoadmap;
}

async function updateDraft(roadmapId, userId, { title, description, yamlCode, nodes, tags = [] }) {
    const existing = await ManualRoadmap.findOne({ _id: roadmapId, userId });
    if (!existing) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    if (existing.status !== 'draft') {
        throw new RoadmapError(409, ERROR_CODES.PUBLICATION_ERROR, 'Only draft roadmaps can be updated. Create a new manual roadmap for a new version.');
    }

    // Enrich and validate new nodes
    const enrichedNodes = enrichNodes(nodes);
    const edges = generateEdgesFromHierarchy(enrichedNodes, {
        includePrerequisites: true,
        deduplicateEdges: true,
    });

    const validation = validateHierarchy(enrichedNodes, edges);
    if (!validation.isValid) {
        throw new RoadmapError(400, ERROR_CODES.INVALID_DATA, `Hierarchy validation failed: ${validation.errors.join('; ')}`);
    }

    // Update document
    existing.title = title;
    existing.description = description;
    existing.yamlCode = yamlCode;
    existing.nodes = enrichedNodes;
    existing.edges = edges;
    existing.tags = Array.isArray(tags) ? tags : [];
    existing.shared = true;
    existing.isPublic = true;
    existing.sharedAt = existing.sharedAt || new Date();
    existing.updatedAt = new Date();

    await existing.save();

    // Record a version snapshot (best-effort — does not fail the save)
    roadmapVersionService.createVersion(existing._id, existing.yamlCode).catch(() => {});

    return existing.toObject();
}

function serializeTag(tag) {
    if (!tag || typeof tag !== 'object') {
        return null;
    }
    return {
        label: tag.label || '',
        normalizedLabel: (tag.normalizedLabel || '').toLowerCase(),
    };
}

async function getDistinctTags() {
    const publicRoadmaps = await ManualRoadmap.find(
        { isPublic: true },
        { tags: 1 }
    ).lean();

    const tagMap = new Map();
    for (const roadmap of publicRoadmaps) {
        if (Array.isArray(roadmap.tags)) {
            for (const tag of roadmap.tags) {
                const normalized = (tag.normalizedLabel || '').toLowerCase();
                if (normalized && !tagMap.has(normalized)) {
                    tagMap.set(normalized, serializeTag(tag));
                }
            }
        }
    }

    return Array.from(tagMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

async function share(roadmapId, userId) {
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId });
    if (!roadmap) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    if (roadmap.status !== 'draft') {
        throw new RoadmapError(409, ERROR_CODES.PUBLICATION_ERROR, 'Only draft roadmaps can be shared.');
    }

    roadmap.shared = true;
    roadmap.isPublic = true;
    roadmap.status = 'published';
    roadmap.sharedAt = new Date();

    await roadmap.save();
    return roadmap.toObject();
}

async function unshare(roadmapId, userId) {
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId });
    if (!roadmap) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    if (roadmap.status !== 'published') {
        throw new RoadmapError(409, ERROR_CODES.PUBLICATION_ERROR, 'Only published roadmaps can be unpublished.');
    }

    roadmap.shared = false;
    roadmap.isPublic = false;
    roadmap.status = 'draft';
    roadmap.sharedAt = null;
    roadmap.updatedAt = new Date();

    await roadmap.save();
    return roadmap.toObject();
}

async function deleteById(roadmapId, userId) {
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId }, { _id: 1 }).lean();
    if (!roadmap) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    await Promise.all([
        ManualRoadmap.deleteOne({ _id: roadmapId, userId }),
        RoadmapProgress.deleteOne({ roadmapId, userId }),
        RoadmapHistory.deleteMany({ roadmapId, userId }),
        RoadmapProgressCache.deleteOne({ roadmapId: String(roadmapId), userId: String(userId) }),
        RoadmapProgressActivity.deleteMany({ roadmapId: String(roadmapId), userId: String(userId) }),
        roadmapVersionService.deleteAllForRoadmap(roadmapId),
    ]);

    return { deleted: true, roadmapId };
}

module.exports = {
    listByUser,
    getByIdForUser,
    getByIdForEdit,
    getByIdForView,
    createDraft,
    updateDraft,
    share,
    unshare,
    deleteById,
    listPublic,
    getPublicPreviewById,
    serializeTag,
    getDistinctTags,
};