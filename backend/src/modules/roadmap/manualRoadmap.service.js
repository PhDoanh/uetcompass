'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');
const { Roadmap } = require('./roadmap.model');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');

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

    return {
        nodeId: node.nodeId,
        nodeType: prerequisites.length > 0 ? 'subtopic' : 'topic',
        skillName: node.label,
        parentNodeId: metadata.parentNodeId || prerequisites[0] || null,
        relatedCourses,
        reason: node.description || metadata.reason || `Learn ${node.label}`,
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
        ManualRoadmap.find(filter, { yamlCode: 0, nodes: 0 })
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
        { title: 1, description: 1, nodes: 1, sharedAt: 1 }
    ).lean();
}

async function getByIdForUser(roadmapId, userId) {
    return ManualRoadmap.findOne({ _id: roadmapId, userId }).lean();
}

async function listByUser(userId, { page = 1, limit = 20 } = {}) {
    limit = Math.min(limit, 100);
    const filter = { userId };

    const [items, total] = await Promise.all([
        ManualRoadmap.find(filter, { yamlCode: 0, nodes: 0 })
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ManualRoadmap.countDocuments(filter),
    ]);

    return { items, pagination: { page, limit, total } };
}

async function createDraft(userId, { title, description, yamlCode, nodes }) {
    const manualRoadmap = await ManualRoadmap.create({
        userId,
        title,
        description,
        yamlCode,
        nodes,
        shared: false,
        isPublic: false,
        status: 'draft',
    });

    await syncToRoadmapCollection(manualRoadmap._id, userId, { title, nodes });
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

    existing.title = title;
    existing.description = description;
    existing.yamlCode = yamlCode;
    existing.nodes = nodes;
    existing.updatedAt = new Date();

    await existing.save();
    await syncToRoadmapCollection(existing._id, userId, { title, nodes });
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
    createDraft,
    updateDraft,
    share,
    listPublic,
    getPublicPreviewById,
};