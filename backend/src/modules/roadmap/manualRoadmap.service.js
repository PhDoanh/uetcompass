'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');
const { Roadmap } = require('./roadmap.model');
const { RoadmapProgress } = require('./roadmapProgress.model');
const { RoadmapHistory } = require('./roadmapHistory.model');
const RoadmapProgressCache = require('../progress/roadmapProgressCache.model');
const RoadmapProgressActivity = require('../progress/roadmapProgressActivity.model');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');
const { generateEdgesFromHierarchy, enrichNodes, validateHierarchy } = require('./graph.generator');

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveStudentProfileId(userId) {
    const profile = await StudentProfile.findOne({ userId }, { _id: 1 }).lean();
    if (!profile?._id) {
        throw new RoadmapError(409, ERROR_CODES.CONFLICT, 'Please complete onboarding profile before saving a manual roadmap into primary roadmap collection.');
    }
    return profile._id;
}

function toRoadmapNode(node) {
    const prerequisites = Array.isArray(node.prerequisites) ? node.prerequisites.filter(Boolean) : [];
    const metadata = node && typeof node.metadata === 'object' && node.metadata !== null ? node.metadata : {};
    const relatedCourses = Array.isArray(metadata.relatedCourses) ? metadata.relatedCourses : [];
    const resources = Array.isArray(node.resources)
        ? node.resources
        : (Array.isArray(metadata.resources) ? metadata.resources : []);
    const label = String(node.label || '').trim();

    return {
        nodeId: node.nodeId,
        nodeType: prerequisites.length > 0 ? 'subtopic' : 'topic',
        skillName: String(node.skillName || label).trim(),
        parentNodeId: metadata.parentNodeId || prerequisites[0] || null,
        relatedCourses,
        reason: node.description || metadata.reason || `Learn ${label}`,
        resources,
    };
}

async function syncToRoadmapCollection(roadmapId, userId, { title, nodes }) {
    const studentProfileId = await resolveStudentProfileId(userId);
    const mappedNodes = Array.isArray(nodes) ? nodes.map(toRoadmapNode) : [];

    await Roadmap.findOneAndUpdate(
        { _id: roadmapId, userId },
        {
            $set: {
                userId,
                isPrimary: false,
                studentProfileId,
                roadmapName: title,
                personalisationLevel: 'full',
                nodes: mappedNodes,
                acceptedAt: new Date(),
                updatedAt: new Date(),
            },
            $setOnInsert: { _id: roadmapId, createdAt: new Date() },
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
        }
    );
}

async function listPublic({ q = '', tags = [], page = 1, limit = 20 } = {}) {
    limit = Math.min(limit, 100);
    const filter = { isPublic: true };

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

    const sharedAt = new Date();
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
        sharedAt,
    });

    let syncSkipped = false;
    try {
        await syncToRoadmapCollection(manualRoadmap._id, userId, { title, nodes: enrichedNodes });
    } catch (err) {
        if (err instanceof RoadmapError && err.code === ERROR_CODES.CONFLICT) {
            // Log and continue — draft is still created and persisted in ManualRoadmap.
            // eslint-disable-next-line no-console
            console.warn('syncToRoadmapCollection skipped:', err.message);
            syncSkipped = true;
        } else {
            throw err;
        }
    }

    const result = typeof manualRoadmap.toObject === 'function' ? manualRoadmap.toObject() : manualRoadmap;
    if (syncSkipped) result.syncSkipped = true;
    return result;
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
    let syncSkippedOnUpdate = false;
    try {
        await syncToRoadmapCollection(existing._id, userId, { title, nodes: enrichedNodes });
    } catch (err) {
        if (err instanceof RoadmapError && err.code === ERROR_CODES.CONFLICT) {
            // Allow update to succeed even if onboarding/profile is missing.
            // eslint-disable-next-line no-console
            console.warn('syncToRoadmapCollection skipped on update:', err.message);
            syncSkippedOnUpdate = true;
        } else {
            throw err;
        }
    }

    const out = existing.toObject();
    if (syncSkippedOnUpdate) out.syncSkipped = true;
    return out;
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

async function deleteById(roadmapId, userId) {
    const roadmap = await ManualRoadmap.findOne({ _id: roadmapId, userId }, { _id: 1 }).lean();
    if (!roadmap) {
        throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
    }

    await Promise.all([
        ManualRoadmap.deleteOne({ _id: roadmapId, userId }),
        Roadmap.deleteOne({ _id: roadmapId, userId }),
        RoadmapProgress.deleteOne({ roadmapId, userId }),
        RoadmapHistory.deleteMany({ roadmapId, userId }),
        RoadmapProgressCache.deleteOne({ roadmapId: String(roadmapId), userId: String(userId) }),
        RoadmapProgressActivity.deleteMany({ roadmapId: String(roadmapId), userId: String(userId) }),
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
    deleteById,
    listPublic,
    getPublicPreviewById,
    serializeTag,
    getDistinctTags,
};