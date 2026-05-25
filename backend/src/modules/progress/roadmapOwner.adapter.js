'use strict';

const roadmapService = require('../roadmap/roadmap.service');
const { ManualRoadmap } = require('../roadmap/manualRoadmap.model');

function buildRoadmapName(roadmapDoc) {
  if (roadmapDoc?.roadmapName) {
    return roadmapDoc.roadmapName;
  }

  const level = roadmapDoc?.personalisationLevel === 'low' ? 'Generic' : 'Personalized';
  return `${level} Roadmap`;
}

function normalizeRoadmap(roadmapDoc) {
  if (!roadmapDoc) {
    return null;
  }

  const roadmapId = roadmapDoc._id?.toString?.() || String(roadmapDoc._id || '');
  return {
    roadmapId,
    roadmapName: buildRoadmapName(roadmapDoc),
    isPrimary: Boolean(roadmapDoc.isPrimary),
    createdAt: roadmapDoc.createdAt || null,
    acceptedAt: roadmapDoc.acceptedAt || null,
  };
}

function normalizeManualRoadmap(roadmapDoc) {
  if (!roadmapDoc) {
    return null;
  }

  const roadmapId = roadmapDoc._id?.toString?.() || String(roadmapDoc._id || '');
  return {
    roadmapId,
    roadmapName: String(roadmapDoc.title || 'Manual Roadmap').trim(),
    isPrimary: false,
    createdAt: roadmapDoc.createdAt || null,
    acceptedAt: roadmapDoc.sharedAt || roadmapDoc.updatedAt || null,
  };
}

async function listOwnedRoadmaps(userId) {
  const result = await roadmapService.listByUser(userId, {
    status: 'completed',
    page: 1,
    limit: 100,
  });

  const manualRoadmaps = await ManualRoadmap.find(
    { userId },
    { title: 1, createdAt: 1, updatedAt: 1, sharedAt: 1 }
  )
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return [
    ...(result?.items || []).map(normalizeRoadmap).filter(Boolean),
    ...manualRoadmaps.map(normalizeManualRoadmap).filter(Boolean),
  ];
}

async function getOwnedRoadmap(userId, roadmapId) {
  const roadmap = await roadmapService.getByIdForUser(roadmapId, userId);
  if (roadmap) {
    return normalizeRoadmap(roadmap);
  }

  const manualRoadmap = await ManualRoadmap.findOne(
    { _id: roadmapId, userId },
    { title: 1, createdAt: 1, updatedAt: 1, sharedAt: 1 }
  ).lean();
  return normalizeManualRoadmap(manualRoadmap);
}

module.exports = {
  listOwnedRoadmaps,
  getOwnedRoadmap,
};
