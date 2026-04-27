'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');
const { Roadmap } = require('./roadmap.model');
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

async function listPublic({ q = '', page = 1, limit = 20 } = {}) {
    limit = Math.min(limit, 100);
    const filter = {};

    const normalizedQuery = String(q || '').trim();
    if (normalizedQuery) {
        filter.title = { $regex: escapeRegex(normalizedQuery), $options: 'i' };
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

async function createDraft(userId, { title, description, yamlCode, nodes }) {
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
        shared: true,
        isPublic: true,
        status: 'draft',
        sharedAt,
    });

    await syncToRoadmapCollection(manualRoadmap._id, userId, { title, nodes: enrichedNodes });
    return manualRoadmap;
}

async function updateDraft(roadmapId, userId, { title, description, yamlCode, nodes }) {
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
    existing.shared = true;
    existing.isPublic = true;
    existing.sharedAt = existing.sharedAt || new Date();
    existing.updatedAt = new Date();

    await existing.save();
    await syncToRoadmapCollection(existing._id, userId, { title, nodes: enrichedNodes });
    return existing.toObject();
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

module.exports = {
    listByUser,
    getByIdForUser,
    getByIdForEdit,
    getByIdForView,
    createDraft,
    updateDraft,
    share,
    listPublic,
    getPublicPreviewById,
};