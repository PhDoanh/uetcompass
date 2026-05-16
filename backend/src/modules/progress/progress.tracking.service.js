'use strict';

const RoadmapProgressActivity = require('./roadmapProgressActivity.model');
const RoadmapProgressCache = require('./roadmapProgressCache.model');
const roadmapOwnerAdapter = require('./roadmapOwner.adapter');

const VALID_SCOPES = new Set(['all', 'roadmap']);
const VALID_GROUPINGS = new Set(['weekly', 'monthly']);

function createServiceError(status, code, message, details = undefined) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}

function normalizeScope(scope) {
  return String(scope || '').trim().toLowerCase();
}

function normalizeGroupBy(groupBy) {
  return String(groupBy || '').trim().toLowerCase();
}

function startOfDayUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDaysUtc(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getWeekStartUtc(date) {
  const start = startOfDayUtc(date);
  const day = start.getUTCDay();
  return addDaysUtc(start, -day);
}

function getMonthStartUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getPeriodStartUtc(date, groupBy) {
  return groupBy === 'monthly' ? getMonthStartUtc(date) : getWeekStartUtc(date);
}

function getPeriodEndUtc(start, groupBy) {
  if (groupBy === 'monthly') {
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return end;
  }

  return addDaysUtc(start, 6);
}

function formatDateUtc(date) {
  return date.toISOString().slice(0, 10);
}

function getBucketKey(date, groupBy) {
  const start = getPeriodStartUtc(date, groupBy);
  return formatDateUtc(start);
}

function ensureBucket(buckets, key, groupBy) {
  if (!buckets.has(key)) {
    const start = new Date(`${key}T00:00:00.000Z`);
    const end = getPeriodEndUtc(start, groupBy);
    buckets.set(key, {
      periodStart: formatDateUtc(start),
      periodEnd: formatDateUtc(end),
      activeDays: 0,
      activeNodes: 0,
      completedNodes: 0,
      completionRate: 0,
      activeDaysSet: new Set(),
      activeNodesSet: new Set(),
    });
  }

  return buckets.get(key);
}

function buildBucketsFromActivity(activityDocs, groupBy) {
  const buckets = new Map();
  const now = new Date();

  for (const activity of activityDocs) {
    const startRaw = activity?.lastInProgressAt || activity?.lastDoneAt;
    if (!startRaw) {
      continue;
    }

    const endRaw = activity?.lastDoneAt || now;
    const windowStart = startOfDayUtc(new Date(startRaw));
    const windowEnd = startOfDayUtc(new Date(endRaw));

    let start = windowStart;
    let end = windowEnd;
    if (end.getTime() < start.getTime()) {
      start = windowEnd;
      end = windowStart;
    }

    for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDaysUtc(cursor, 1)) {
      const bucketKey = getBucketKey(cursor, groupBy);
      const bucket = ensureBucket(buckets, bucketKey, groupBy);
      bucket.activeDaysSet.add(formatDateUtc(cursor));
      bucket.activeNodesSet.add(activity.nodeId);
    }

    if (activity?.lastDoneAt) {
      const doneBucketKey = getBucketKey(new Date(activity.lastDoneAt), groupBy);
      const bucket = ensureBucket(buckets, doneBucketKey, groupBy);
      bucket.completedNodes += 1;
    }
  }

  return buckets;
}

async function updateNodeActivity(userId, roadmapId, nodeId, newStatus) {
  const userKey = String(userId || '').trim();
  const roadmapKey = String(roadmapId || '').trim();
  const nodeKey = String(nodeId || '').trim();

  if (!userKey || !roadmapKey || !nodeKey) {
    throw createServiceError(400, 'INVALID_INPUT', 'userId, roadmapId, and nodeId are required');
  }

  const status = String(newStatus || '').trim().toLowerCase();
  const now = new Date();
  const update = {
    $set: {
      updatedAt: now,
    },
    $setOnInsert: {
      userId: userKey,
      roadmapId: roadmapKey,
      nodeId: nodeKey,
    },
  };

  if (status === 'inprogress' || status === 'in_progress') {
    update.$set.lastInProgressAt = now;
  } else if (status === 'completed' || status === 'done') {
    update.$set.lastDoneAt = now;
  } else {
    return null;
  }

  return RoadmapProgressActivity.updateOne(
    { userId: userKey, roadmapId: roadmapKey, nodeId: nodeKey },
    update,
    { upsert: true }
  );
}

async function getTrackingTables(userId, { scope, roadmapId, groupBy }) {
  const userKey = String(userId || '').trim();
  if (!userKey) {
    throw createServiceError(400, 'INVALID_INPUT', 'userId is required');
  }

  const normalizedScope = normalizeScope(scope);
  const normalizedGroupBy = normalizeGroupBy(groupBy);

  if (!VALID_SCOPES.has(normalizedScope)) {
    throw createServiceError(400, 'INVALID_INPUT', 'scope must be "all" or "roadmap"');
  }

  if (!VALID_GROUPINGS.has(normalizedGroupBy)) {
    throw createServiceError(400, 'INVALID_INPUT', 'groupBy must be "weekly" or "monthly"');
  }

  const ownedRoadmaps = await roadmapOwnerAdapter.listOwnedRoadmaps(userKey);
  const ownedRoadmapIds = ownedRoadmaps.map((roadmap) => roadmap.roadmapId);

  if (ownedRoadmapIds.length === 0) {
    return {
      scope: normalizedScope,
      roadmapId: normalizedScope === 'roadmap' ? String(roadmapId || '') : undefined,
      groupBy: normalizedGroupBy,
      summary: {
        totalNodes: 0,
        completedNodes: 0,
        completionRate: 0,
      },
      buckets: [],
    };
  }

  const roadmapKey = String(roadmapId || '').trim();
  if (normalizedScope === 'roadmap') {
    if (!roadmapKey) {
      throw createServiceError(400, 'INVALID_INPUT', 'roadmapId is required when scope=roadmap');
    }

    if (!ownedRoadmapIds.includes(roadmapKey)) {
      throw createServiceError(403, 'FORBIDDEN', 'You do not have access to this roadmap');
    }
  }

  const activityFilter = {
    userId: userKey,
    roadmapId: normalizedScope === 'roadmap' ? roadmapKey : { $in: ownedRoadmapIds },
  };

  const activityDocs = await RoadmapProgressActivity.find(activityFilter).lean();
  const bucketMap = buildBucketsFromActivity(activityDocs, normalizedGroupBy);

  const completedNodes = activityDocs.filter((doc) => doc?.lastDoneAt).length;
  let totalNodes = 0;

  if (normalizedScope === 'roadmap') {
    const cacheDoc = await RoadmapProgressCache.findOne({ userId: userKey, roadmapId: roadmapKey }).lean();
    totalNodes = cacheDoc?.totalNodes || 0;
  } else {
    const cacheDocs = await RoadmapProgressCache.find({ userId: userKey, roadmapId: { $in: ownedRoadmapIds } }).lean();
    totalNodes = cacheDocs.reduce((sum, doc) => sum + (doc?.totalNodes || 0), 0);
  }

  const summaryCompletionRate = totalNodes === 0 ? 0 : completedNodes / totalNodes;

  const buckets = Array.from(bucketMap.values())
    .map((bucket) => {
      const activeDays = bucket.activeDaysSet.size;
      const activeNodes = bucket.activeNodesSet.size;
      const completionRate = totalNodes === 0 ? 0 : bucket.completedNodes / totalNodes;
      return {
        periodStart: bucket.periodStart,
        periodEnd: bucket.periodEnd,
        activeDays,
        activeNodes,
        completedNodes: bucket.completedNodes,
        completionRate,
      };
    })
    .sort((a, b) => (a.periodStart < b.periodStart ? -1 : 1));

  return {
    scope: normalizedScope,
    roadmapId: normalizedScope === 'roadmap' ? roadmapKey : undefined,
    groupBy: normalizedGroupBy,
    summary: {
      totalNodes,
      completedNodes,
      completionRate: summaryCompletionRate,
    },
    buckets,
  };
}

module.exports = {
  updateNodeActivity,
  getTrackingTables,
  createServiceError,
};
