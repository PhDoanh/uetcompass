'use strict';

const RoadmapProgressCache = require('./roadmapProgressCache.model');
const roadmapOwnerAdapter = require('./roadmapOwner.adapter');
const progressSse = require('./progress.sse');
const skillTreeService = require('../skill-tree/skillTree.service');

const RETRY_DELAY_MS = 3000;

function createServiceError(status, code, message, details = undefined) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}

function computeProgressPercent(doneNodes, totalNodes) {
  if (!totalNodes) {
    return 0;
  }
  return Math.round((doneNodes / totalNodes) * 100);
}

function mapDetailNode(node, fallbackStatus) {
  return {
    nodeId: node?.nodeId || node?.courseCode || '',
    courseCode: node?.courseCode || '',
    courseName: node?.courseName || node?.courseCode || 'Unknown Course',
    status: node?.status || fallbackStatus,
    updatedAt: node?.updatedAt || null,
  };
}

function maxUpdatedAt(nodes) {
  let maxValue = 0;
  for (const node of nodes) {
    const value = node?.updatedAt ? new Date(node.updatedAt).getTime() : 0;
    if (!Number.isNaN(value) && value > maxValue) {
      maxValue = value;
    }
  }
  return maxValue ? new Date(maxValue) : new Date();
}

async function refreshCache(userId, roadmapId, options = {}) {
  const retryCount = Number.isInteger(options.retryCount) ? options.retryCount : 0;
  const userKey = String(userId || '');
  const roadmapKey = String(roadmapId || '');

  if (!userKey || !roadmapKey) {
    throw createServiceError(400, 'INVALID_INPUT', 'userId and roadmapId are required');
  }

  const ownedRoadmap = await roadmapOwnerAdapter.getOwnedRoadmap(userKey, roadmapKey);
  if (!ownedRoadmap) {
    throw createServiceError(404, 'ROADMAP_NOT_FOUND', 'Roadmap does not exist or is not owned by the user');
  }

  try {
    const detail = await skillTreeService.getNodesByStatus(userKey, roadmapKey);

    const done = (detail?.done || []).map((node) => mapDetailNode(node, 'done'));
    const inProgress = (detail?.inProgress || []).map((node) => mapDetailNode(node, 'in_progress'));
    const pending = (detail?.pending || []).map((node) => mapDetailNode(node, 'pending'));

    const doneNodes = done.length;
    const inProgressNodes = inProgress.length;
    const pendingNodes = pending.length;
    const totalNodes = doneNodes + inProgressNodes + pendingNodes;

    const payload = {
      userId: userKey,
      roadmapId: roadmapKey,
      roadmapName: ownedRoadmap.roadmapName,
      isPrimary: ownedRoadmap.isPrimary,
      roadmapCreatedAt: ownedRoadmap.createdAt || null,
      roadmapAcceptedAt: ownedRoadmap.acceptedAt || null,
      totalNodes,
      doneNodes,
      inProgressNodes,
      pendingNodes,
      progressPercent: computeProgressPercent(doneNodes, totalNodes),
      lastActivityDate: maxUpdatedAt([...done, ...inProgress, ...pending]),
      updatedAt: new Date(),
    };

    const cacheDoc = await RoadmapProgressCache.findOneAndUpdate(
      { userId: userKey, roadmapId: roadmapKey },
      {
        $set: payload,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, lean: true }
    );

    progressSse.notifyUser(userKey, {
      roadmapId: payload.roadmapId,
      roadmapName: payload.roadmapName,
      isPrimary: payload.isPrimary,
      roadmapCreatedAt: payload.roadmapCreatedAt,
      roadmapAcceptedAt: payload.roadmapAcceptedAt,
      totalNodes: payload.totalNodes,
      doneNodes: payload.doneNodes,
      inProgressNodes: payload.inProgressNodes,
      pendingNodes: payload.pendingNodes,
      progressPercent: payload.progressPercent,
      lastActivityDate: payload.lastActivityDate,
    });

    return cacheDoc;
  } catch (error) {
    if (retryCount < 1) {
      setTimeout(() => {
        refreshCache(userKey, roadmapKey, { retryCount: retryCount + 1 }).catch(() => {
          // best-effort eventual consistency retry
        });
      }, RETRY_DELAY_MS);
    }

    throw error;
  }
}

async function getAll(userId) {
  const userKey = String(userId || '');
  if (!userKey) {
    throw createServiceError(400, 'INVALID_INPUT', 'userId is required');
  }

  const docs = await RoadmapProgressCache.find({ userId: userKey })
    .sort({ isPrimary: -1, updatedAt: -1 })
    .lean();
  const ownedRoadmaps = await roadmapOwnerAdapter.listOwnedRoadmaps(userKey);
  const ownedRoadmapMap = new Map(
    ownedRoadmaps.map((roadmap) => [roadmap.roadmapId, roadmap])
  );

  return docs.map((doc) => {
    const ownedRoadmap = ownedRoadmapMap.get(doc.roadmapId);
    const roadmapCreatedAt = doc.roadmapCreatedAt || ownedRoadmap?.createdAt || null;
    const roadmapAcceptedAt = doc.roadmapAcceptedAt || ownedRoadmap?.acceptedAt || null;
    return {
      roadmapId: doc.roadmapId,
      roadmapName: doc.roadmapName,
      isPrimary: Boolean(doc.isPrimary),
      roadmapCreatedAt,
      roadmapAcceptedAt,
      totalNodes: doc.totalNodes || 0,
      doneNodes: doc.doneNodes || 0,
      inProgressNodes: doc.inProgressNodes || 0,
      pendingNodes: doc.pendingNodes || 0,
      progressPercent: doc.progressPercent || 0,
      lastActivityDate: doc.lastActivityDate || null,
    };
  });
}

async function getRoadmapDetail(userId, roadmapId) {
  const userKey = String(userId || '');
  const roadmapKey = String(roadmapId || '');

  if (!userKey || !roadmapKey) {
    throw createServiceError(400, 'INVALID_INPUT', 'userId and roadmapId are required');
  }

  const ownedRoadmap = await roadmapOwnerAdapter.getOwnedRoadmap(userKey, roadmapKey);
  if (!ownedRoadmap) {
    throw createServiceError(403, 'FORBIDDEN', 'You do not have access to this roadmap');
  }

  const detail = await skillTreeService.getNodesByStatus(userKey, roadmapKey);

  const done = (detail?.done || []).map((node) => mapDetailNode(node, 'done'));
  const inProgress = (detail?.inProgress || []).map((node) => mapDetailNode(node, 'in_progress'));
  const pending = (detail?.pending || []).map((node) => mapDetailNode(node, 'pending'));

  return {
    roadmapId: roadmapKey,
    roadmapName: detail?.roadmapName || ownedRoadmap.roadmapName,
    nodes: {
      done,
      inProgress,
      pending,
    },
  };
}

module.exports = {
  refreshCache,
  getAll,
  getRoadmapDetail,
  computeProgressPercent,
  createServiceError,
};
