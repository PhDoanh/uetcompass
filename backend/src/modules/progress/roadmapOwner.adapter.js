'use strict';

const roadmapService = require('../roadmap/roadmap.service');

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

async function listOwnedRoadmaps(userId) {
  const result = await roadmapService.listByUser(userId, {
    status: 'completed',
    page: 1,
    limit: 100,
  });

  return (result?.items || []).map(normalizeRoadmap).filter(Boolean);
}

async function getOwnedRoadmap(userId, roadmapId) {
  const roadmap = await roadmapService.getByIdForUser(roadmapId, userId);
  return normalizeRoadmap(roadmap);
}

module.exports = {
  listOwnedRoadmaps,
  getOwnedRoadmap,
};
