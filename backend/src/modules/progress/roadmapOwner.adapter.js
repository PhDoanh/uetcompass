'use strict';

const { ManualRoadmap } = require('../roadmap/manualRoadmap.model');

function normalizeRoadmap(roadmapDoc) {
  if (!roadmapDoc) return null;

  const roadmapId = roadmapDoc._id?.toString?.() || String(roadmapDoc._id || '');
  return {
    roadmapId,
    roadmapName: String(roadmapDoc.title || 'Roadmap').trim(),
    isPrimary: Boolean(roadmapDoc.isPrimary),
    createdAt: roadmapDoc.createdAt || null,
    acceptedAt: roadmapDoc.acceptedAt || null,
  };
}

async function listOwnedRoadmaps(userId) {
  const roadmaps = await ManualRoadmap.find(
    { userId },
    { title: 1, isPrimary: 1, createdAt: 1, updatedAt: 1, acceptedAt: 1 }
  )
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return roadmaps.map(normalizeRoadmap).filter(Boolean);
}

async function getOwnedRoadmap(userId, roadmapId) {
  const roadmap = await ManualRoadmap.findOne(
    { _id: roadmapId, userId },
    { title: 1, isPrimary: 1, createdAt: 1, updatedAt: 1, acceptedAt: 1 }
  ).lean();
  return normalizeRoadmap(roadmap);
}

module.exports = {
  listOwnedRoadmaps,
  getOwnedRoadmap,
};
