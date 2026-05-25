const primaryRoadmapService = require('./primaryRoadmap.service');
const roadmapProgressService = require('../roadmap/roadmapProgress.service');
const roadmapHistoryService = require('../roadmap/roadmapHistory.service');
const roadmapService = require('../roadmap/roadmap.service');
const previewStore = require('../roadmap/roadmap.preview.store');
const { isGenerating } = require('../roadmap/generation.service');

/**
 * Contract-first Skill Tree service.
 * Reads roadmap/progress from Feature 009-owned contracts and
 * exposes a stable view model for Feature 004 surfaces.
 */

function buildDefaultProgressState(nodes = []) {
  return {
    pending: nodes.map((n) => n.nodeId),
    inProgress: [],
    completed: [],
    skip: [],
  };
}

/**
 * Get full skill tree for a student
 */
async function getSkillTree(studentId) {
  try {
    const roadmap = await primaryRoadmapService.getPrimaryRoadmap(studentId);
    const roadmapId = roadmap.roadmapId;

    // If the user opens Skill Tree after missing SSE, recover from pending in-memory preview.
    let effectiveNodes = roadmap.nodes || [];
    let pendingPreview = null;
    if (!roadmap.acceptedAt && effectiveNodes.length === 0) {
      const preview = previewStore.getPendingPreview(studentId);
      if (preview && Array.isArray(preview.nodes) && preview.nodes.length > 0) {
        effectiveNodes = preview.nodes;
        pendingPreview = {
          studentProfileId: String(preview.studentProfileId || ''),
          roadmapName: String(preview.roadmapName || roadmap.roadmapName || '').trim(),
          personalisationLevel: preview.personalisationLevel === 'low' ? 'low' : 'full',
          nodes: preview.nodes,
        };
      }
    }

    let progressState = buildDefaultProgressState(effectiveNodes);
    if (roadmap.acceptedAt) {
      const progress = await roadmapProgressService.getProgress(studentId, roadmapId);
      if (progress?.state) {
        progressState = progress.state;
      }
    }

    let generationStatus = 'ready';
    if (roadmap.acceptedAt && effectiveNodes.length === 0) {
      generationStatus = 'empty_accepted';
    } else if (!roadmap.acceptedAt && pendingPreview) {
      generationStatus = 'preview_ready';
    } else if (!roadmap.acceptedAt && isGenerating(studentId)) {
      generationStatus = 'generating';
    } else if (!roadmap.acceptedAt) {
      generationStatus = 'retryable_failed';
    }

    return {
      roadmapId,
      roadmapName: roadmap.roadmapName,
      personalisationLevel: roadmap.personalisationLevel,
      createdAt: roadmap.createdAt,
      acceptedAt: roadmap.acceptedAt,
      isPrimary: roadmap.isPrimary,
      nodes: effectiveNodes,
      progress: progressState,
      isRetryable: !roadmap.acceptedAt,
      generationStatus,
      pendingPreview,
    };
  } catch (err) {
    if (err.code && err.status) {
      throw err;
    }
    throw createServiceError(503, 'ROADMAP_FETCH_FAILED', err.message, { cause: err });
  }
}

/**
 * Update one progress node transition
 */
async function updateNodeState(studentId, roadmapId, { nodeId, fromState, toState }) {
  try {
    const roadmap = await roadmapService.getByIdForUser(roadmapId, studentId);
    if (!roadmap) {
      throw createServiceError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found.');
    }

    const existingProgress = await roadmapProgressService.getProgress(studentId, roadmapId);
    if (!existingProgress) {
      const nodeIds = (roadmap.nodes || []).map((node) => node.nodeId).filter(Boolean);
      await roadmapProgressService.createProgress(studentId, roadmapId, nodeIds);
    }

    const updated = await roadmapProgressService.updateNodeState(
      studentId,
      roadmapId,
      nodeId,
      fromState,
      toState
    );

    try {
      const progressService = require('../progress/progress.service');
      await progressService.refreshCache(studentId, roadmapId);
    } catch (err) {
      console.error('[progress] refreshCache failed:', err.message);
    }

    try {
      const progressTrackingService = require('../progress/progress.tracking.service');
      await progressTrackingService.updateNodeActivity(studentId, roadmapId, nodeId, toState);
    } catch (err) {
      console.error('[progress] updateNodeActivity failed:', err.message);
    }

    return {
      roadmapId: String(updated.roadmapId),
      state: updated.state,
      updatedAt: updated.updatedAt,
    };
  } catch (err) {
    if (err.code && err.status) {
      throw err;
    }
    throw createServiceError(500, 'UPDATE_FAILED', err.message, { cause: err });
  }
}

async function getRoadmapHistory(studentId, roadmapId, { limit = 50 } = {}) {
  try {
    const roadmap = await roadmapService.getByIdForUser(roadmapId, studentId);
    if (!roadmap) {
      return null;
    }

    return await roadmapHistoryService.listByRoadmap(studentId, roadmapId, { limit });
  } catch (err) {
    throw createServiceError(500, 'HISTORY_FETCH_FAILED', err.message, { cause: err });
  }
}

/**
 * Get progress by roadmap
 */
async function getRoadmapProgress(studentId, roadmapId) {
  try {
    const roadmap = await roadmapService.getByIdForUser(roadmapId, studentId);
    if (!roadmap) {
      return null;
    }

    return await roadmapProgressService.getProgress(studentId, roadmapId);
  } catch (err) {
    throw createServiceError(500, 'PROGRESS_FETCH_FAILED', err.message, { cause: err });
  }
}

function buildCourseNodePayload(node, status, updatedAt) {
  const course = Array.isArray(node?.relatedCourses) ? node.relatedCourses[0] : null;
  const courseCode = course?.courseCode || node?.nodeId || '';
  const courseName = course?.courseName || node?.skillName || courseCode || 'Unknown Course';

  return {
    nodeId: node?.nodeId || courseCode,
    courseCode,
    courseName,
    status,
    updatedAt: updatedAt || null,
  };
}

async function getNodesByStatus(studentId, roadmapId) {
  try {
    const roadmap = await roadmapService.getByIdForUser(roadmapId, studentId);
    if (!roadmap) {
      throw createServiceError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found.');
    }

    const nodes = roadmap.nodes || [];
    const progress = await roadmapProgressService.getProgress(studentId, roadmapId);
    const state = progress?.state || buildDefaultProgressState(nodes);
    const updatedAt = progress?.updatedAt || null;

    const doneSet = new Set(state.completed || []);
    const inProgressSet = new Set(state.inProgress || []);
    const pendingSet = new Set(state.pending || []);
    const skipSet = new Set(state.skip || []);

    const done = [];
    const inProgress = [];
    const pending = [];

    for (const node of nodes) {
      if (!node?.nodeId) {
        continue;
      }

      if (doneSet.has(node.nodeId)) {
        done.push(buildCourseNodePayload(node, 'done', updatedAt));
        continue;
      }

      if (inProgressSet.has(node.nodeId)) {
        inProgress.push(buildCourseNodePayload(node, 'in_progress', updatedAt));
        continue;
      }

      if (pendingSet.has(node.nodeId) || skipSet.has(node.nodeId)) {
        pending.push(buildCourseNodePayload(node, 'pending', updatedAt));
        continue;
      }

      pending.push(buildCourseNodePayload(node, 'pending', updatedAt));
    }

    return {
      roadmapId: String(roadmap._id),
      roadmapName: roadmap.roadmapName,
      done,
      inProgress,
      pending,
    };
  } catch (err) {
    if (err.code && err.status) {
      throw err;
    }
    throw createServiceError(500, 'NODE_STATUS_FETCH_FAILED', err.message, { cause: err });
  }
}

/**
 * Helper: create structured error
 */
function createServiceError(status, code, message, details = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

module.exports = {
  getSkillTree,
  updateNodeState,
  getRoadmapProgress,
  getNodesByStatus,
  getRoadmapHistory,
  buildDefaultProgressState,
  createServiceError,
};
