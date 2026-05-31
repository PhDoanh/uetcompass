'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');
const { User } = require('../auth/user.model');
const mongoose = require('mongoose');
const { RoadmapProgress } = require('./roadmapProgress.model');
const { RoadmapHistory } = require('./roadmapHistory.model');
const RoadmapProgressCache = require('../progress/roadmapProgressCache.model');
const RoadmapProgressActivity = require('../progress/roadmapProgressActivity.model');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');
const roadmapVersionService = require('./roadmapVersion.service');
const { generateEdgesFromHierarchy, enrichNodes, validateHierarchy } = require('./graph.generator');
const roadmapTemplates = require('./roadmapTemplates');

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listPublic({ q = '', tags = [], userId = '', page = 1, limit = 20 } = {}) {
    limit = Math.min(limit, 100);
    const filter = { isPublic: true, isPrimary: { $ne: true } };

    const normalizedUserId = String(userId || '').trim();
    if (normalizedUserId) {
        // aggregate() does not auto-coerce strings to ObjectId — must cast explicitly
        filter.userId = mongoose.isValidObjectId(normalizedUserId)
            ? new mongoose.Types.ObjectId(normalizedUserId)
            : normalizedUserId;
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
        ManualRoadmap.aggregate([
            { $match: filter },
            { $addFields: { nodeCount: { $size: { $ifNull: ['$nodes', []] } } } },
            { $project: { yamlCode: 0, nodes: 0, edges: 0 } },
            { $sort: { averageRating: -1, sharedAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
        ]),
        ManualRoadmap.countDocuments(filter),
    ]);

    // Enrich items with owner profile (displayName, avatarUrl), respecting privacySetting
    const ownerIds = [...new Set(items.map(item => String(item.userId)).filter(Boolean))];
    if (ownerIds.length > 0) {
        const owners = await User.find(
            { _id: { $in: ownerIds } },
            { displayName: 1, fullName: 1, avatarUrl: 1, privacySetting: 1 }
        ).lean();
        const ownerMap = Object.fromEntries(owners.map(u => [String(u._id), u]));
        for (const item of items) {
            const owner = ownerMap[String(item.userId)];
            if (owner) {
                if (owner.privacySetting === 'anonymous') {
                    item.ownerName = null;   // frontend shows "Ẩn danh"
                    item.ownerAvatar = null;
                    item.ownerUserId = null; // anonymous: not navigable
                } else {
                    item.ownerName = owner.displayName || owner.fullName || null;
                    item.ownerAvatar = owner.avatarUrl || null;
                    item.ownerUserId = String(item.userId);
                }
            } else {
                // No user record found: system/template roadmap or deleted account
                item.ownerName = 'UETCompass';
                item.ownerAvatar = null;
                item.ownerUserId = null; // not navigable
            }
        }
    }

    // Blend in-memory template roadmaps (only when no userId filter is active)
    if (!normalizedUserId) {
        const templateItems = roadmapTemplates.getAll({ q: normalizedQuery });
        // Templates have no tags — exclude them when a tag filter is active
        const hasTags = Array.isArray(tags) && tags.length > 0;
        if (!hasTags) {
            // Merge templates + DB items, sort combined list by rating desc
            const combined = [...templateItems, ...items];
            combined.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
            return { items: combined, pagination: { page, limit, total: total + templateItems.length } };
        }
    }

    return { items, pagination: { page, limit, total } };
}

async function getPublicPreviewById(roadmapId) {
    // Check in-memory templates first (their IDs are 24-char hex, not ObjectIds)
    const template = roadmapTemplates.getById(String(roadmapId || ''));
    if (template) return template;

    return ManualRoadmap.findOne(
        { _id: roadmapId, isPrimary: { $ne: true } },
        { title: 1, description: 1, nodes: 1, edges: 1, yamlCode: 1, sharedAt: 1 }
    ).lean();
}

/**
 * Fetch roadmap for EDITING (include yamlCode)
 * Editor will re-parse YAML if user modifies it
 */
async function getByIdForEdit(roadmapId, userId) {
    return ManualRoadmap.findOne(
        { _id: roadmapId, userId, isPrimary: { $ne: true } },
        { yamlCode: 1, title: 1, description: 1, status: 1 }
    ).lean();
}

/**
 * Fetch roadmap for VIEWING (include parsed nodes + edges, no yamlCode)
 * Frontend will use nodes/edges directly with ELK.js layout
 */
async function getByIdForView(roadmapId, userId) {
    return ManualRoadmap.findOne(
        { _id: roadmapId, userId, isPrimary: { $ne: true } },
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
    const filter = { userId, isPrimary: { $ne: true } };

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

    roadmapVersionService.createVersion(manualRoadmap._id, manualRoadmap.yamlCode, null).catch(() => {});

    return typeof manualRoadmap.toObject === 'function' ? manualRoadmap.toObject() : manualRoadmap;
}

async function updateDraft(roadmapId, userId, { title, description, yamlCode, nodes, tags = [] }) {
    const existing = await ManualRoadmap.findOne({ _id: roadmapId, userId, isPrimary: { $ne: true } });
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

    // Record a version snapshot with current progress state (best-effort — does not fail the save)
    ;(async () => {
        try {
            const progressDoc = await RoadmapProgress.findOne({ userId, roadmapId: existing._id }).lean();
            await roadmapVersionService.createVersion(existing._id, existing.yamlCode, progressDoc?.state ?? null);
        } catch (_) {}
    })();

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
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId, isPrimary: { $ne: true } });
    if (!roadmap) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    roadmap.shared = true;
    roadmap.isPublic = true;
    roadmap.sharedAt = new Date();

    await roadmap.save();
    return roadmap.toObject();
}

async function unshare(roadmapId, userId) {
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId, isPrimary: { $ne: true } });
    if (!roadmap) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    roadmap.shared = false;
    roadmap.isPublic = false;
    roadmap.sharedAt = null;
    roadmap.updatedAt = new Date();

    await roadmap.save();
    return roadmap.toObject();
}

async function deleteById(roadmapId, userId) {
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId, isPrimary: { $ne: true } }, { _id: 1 }).lean();
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