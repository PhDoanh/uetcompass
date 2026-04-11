const SkillNodeStatus = require('./skillNodeStatus.model');
const primaryRoadmapService = require('./primaryRoadmap.service');
const { validateStatus, getNextStatus } = require('./skillTree.validation');

/**
 * T010: Implement shared DAG utilities and pending reconciliation
 * - getSkillTree: read flow with unlock evaluation
 * - updateNodeStatus: state transition with guard
 * - Helper: isUnlocked(node, statusMap)
 * - Helper: ensurePending(studentId, nodes)
 */

/**
 * Compute unlock state for a node based on prerequisites and student's status records
 */
function isUnlocked(node, statusMap) {
  // No prerequisites = unlocked
  if (!node.prerequisites || node.prerequisites.length === 0) {
    return true;
  }

  // All prerequisites must be "done"
  return node.prerequisites.every((prereqCode) => {
    const prereqStatus = statusMap[prereqCode];
    return prereqStatus && prereqStatus.status === 'done';
  });
}

/**
 * DAG traversal: compute unlock state for all nodes
 */
function evaluateUnlocks(roadmapNodes, statusMap) {
  return roadmapNodes.map((node) => ({
    ...node,
    isUnlocked: isUnlocked(node, statusMap),
  }));
}

/**
 * Ensure explicit pending records exist for all nodes
 */
async function ensurePendingReconciliation(studentId, roadmapNodes) {
  // Get current status records
  const statuses = await SkillNodeStatus.find({ studentId });
  const statusMap = {};
  statuses.forEach((s) => {
    statusMap[s.courseCode] = s;
  });

  // Upsert missing pending records
  const roadmapCourseCodes = roadmapNodes.map((n) => n.courseCode);
  const missingNodes = roadmapCourseCodes.filter((code) => !statusMap[code]);

  if (missingNodes.length > 0) {
    const newRecords = missingNodes.map((courseCode) => ({
      studentId,
      courseCode,
      status: 'pending',
      updatedAt: new Date(),
    }));
    await SkillNodeStatus.insertMany(newRecords, { ordered: false });
  }

  // Return updated status map
  const allStatuses = await SkillNodeStatus.find({ studentId });
  const updated = {};
  allStatuses.forEach((s) => {
    updated[s.courseCode] = s;
  });
  return updated;
}

/**
 * Get full skill tree for a student
 */
async function getSkillTree(studentId) {
  try {
    // 1. Get canonical roadmap from Feature 009
    const roadmap = await primaryRoadmapService.getPrimaryRoadmap(studentId);

    // 2. Ensure explicit pending records
    const statusMap = await ensurePendingReconciliation(studentId, roadmap.nodes);

    // 3. Evaluate unlock states
    const nodesWithUnlock = evaluateUnlocks(roadmap.nodes, statusMap);

    // 4. Attach current status to each node
    const nodesWithStatus = nodesWithUnlock.map((node) => ({
      ...node,
      status: statusMap[node.courseCode]?.status || 'pending',
    }));

    // 5. Repersonalization is handled by Feature 005 (Account Management)
    // Feature 004 (Skill Tree) only displays current roadmap from Feature 009
    // needsRepersonalization flag is determined by Feature 005, not by Skill Tree
    const needsRepersonalization = false;

    return {
      roadmapId: roadmap.roadmapId,
      roadmapName: roadmap.roadmapName,
      careerGoal: roadmap.careerGoal,
      nodes: nodesWithStatus,
      needsRepersonalization,
      repersonalizing: roadmap.repersonalizing || false,
    };
  } catch (err) {
    throw createServiceError(503, 'ROADMAP_FETCH_FAILED', err.message, { cause: err });
  }
}

/**
 * Update node status with guard and persistence
 */
async function updateNodeStatus(studentId, courseCode, requestedStatus) {
  try {
    // 1. Validate status
    const validation = validateStatus(requestedStatus);
    if (!validation.valid) {
      throw createServiceError(400, 'INVALID_STATUS', validation.error);
    }

    // 2. Get current roadmap to check prerequisites
    const roadmap = await primaryRoadmapService.getPrimaryRoadmap(studentId);
    const node = roadmap.nodes.find((n) => n.courseCode === courseCode);
    if (!node) {
      throw createServiceError(404, 'NODE_NOT_FOUND', `Course ${courseCode} not found in roadmap`);
    }

    // 3. Get status map and check unlock
    const statuses = await SkillNodeStatus.find({ studentId });
    const statusMap = {};
    statuses.forEach((s) => {
      statusMap[s.courseCode] = s;
    });

    if (!isUnlocked(node, statusMap)) {
      throw createServiceError(403, 'LOCKED_NODE', 'Cannot update status for locked node');
    }

    // 4. Persist update
    const updated = await SkillNodeStatus.findOneAndUpdate(
      { studentId, courseCode },
      { status: requestedStatus, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    return updated;
  } catch (err) {
    if (err.code) throw err; // Already a service error
    throw createServiceError(500, 'UPDATE_FAILED', err.message, { cause: err });
  }
}

/**
 * Get nodes grouped by status
 */
async function getNodesByStatus(studentId) {
  try {
    const statuses = await SkillNodeStatus.find({ studentId });
    const grouped = {
      done: [],
      inProgress: [],
      pending: [],
    };

    statuses.forEach((s) => {
      if (s.status === 'done') grouped.done.push(s);
      else if (s.status === 'in_progress') grouped.inProgress.push(s);
      else grouped.pending.push(s);
    });

    return grouped;
  } catch (err) {
    throw createServiceError(500, 'GROUP_STATUS_FAILED', err.message, { cause: err });
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
  updateNodeStatus,
  getNodesByStatus,
  isUnlocked,
  evaluateUnlocks,
  ensurePendingReconciliation,
  createServiceError,
};
