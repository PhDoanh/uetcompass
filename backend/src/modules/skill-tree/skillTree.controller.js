const skillTreeService = require('./skillTree.service');
const courseResourceService = require('./courseResource.service');
const marketSkillService = require('./marketSkill.service');
const aiContextService = require('./aiContext.service');
const primaryRoadmapService = require('./primaryRoadmap.service');
const {
  validateNodeId,
  validateProgressState,
  validateProgressTransition,
} = require('./skillTree.validation');

/**
 * T011: Create base controller with error mapping and response helpers
 * T041: Implement all endpoint handlers
 *
 * Note: Repersonalization is handled by Feature 005 (Account Management)
 * Skill Tree only displays the current roadmap from Feature 009
 */

async function getTree(req, res, next) {
  try {
    const userId = req.user.userId; // from auth middleware
    const tree = await skillTreeService.getSkillTree(userId);
    res.json(tree);
  } catch (err) {
    handleError(err, res);
  }
}

async function patchNodeStatus(req, res, next) {
  try {
    const userId = req.user.userId;
    const { roadmapId } = req.params;
    const { nodeId, fromState, toState } = req.body || {};

    const nodeValidation = validateNodeId(nodeId);
    if (!nodeValidation.valid) {
      return res.status(400).json({
        error: { code: 'INVALID_PAYLOAD', message: nodeValidation.error },
      });
    }

    const fromValidation = validateProgressState(fromState, 'fromState');
    if (!fromValidation.valid) {
      return res.status(400).json({
        error: { code: 'INVALID_PAYLOAD', message: fromValidation.error },
      });
    }

    const toValidation = validateProgressState(toState, 'toState');
    if (!toValidation.valid) {
      return res.status(400).json({
        error: { code: 'INVALID_PAYLOAD', message: toValidation.error },
      });
    }

    const transitionValidation = validateProgressTransition(fromState, toState);
    if (!transitionValidation.valid) {
      return res.status(422).json({
        error: { code: 'INVALID_TRANSITION', message: transitionValidation.error },
      });
    }

    const updated = await skillTreeService.updateNodeState(userId, roadmapId, {
      nodeId,
      fromState,
      toState,
    });
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
}

async function getRoadmapProgress(req, res) {
  try {
    const userId = req.user.userId;
    const { roadmapId } = req.params;

    const progress = await skillTreeService.getRoadmapProgress(userId, roadmapId);
    if (!progress) {
      return res.status(404).json({
        error: { code: 'ROADMAP_NOT_FOUND', message: 'Roadmap or progress not found.' },
      });
    }

    return res.json(progress);
  } catch (err) {
    handleError(err, res);
  }
}

async function getNodeResources(req, res, next) {
  try {
    const { courseCode } = req.params;

    const resources = await courseResourceService.getResources(courseCode);
    res.json({ resources });
  } catch (err) {
    handleError(err, res);
  }
}

async function getNodeWhy(req, res, next) {
  try {
    const userId = req.user.userId;
    const { courseCode } = req.params;

    // Get roadmap to find course data
    const roadmap = await primaryRoadmapService.getPrimaryRoadmap(userId);
    const mappedNode = (roadmap.nodes || []).find((n) =>
      (n.relatedCourses || []).some((c) => c.courseCode === courseCode)
    );

    const courseData = mappedNode
      ? {
          courseCode,
          nameVi: (mappedNode.relatedCourses || []).find((c) => c.courseCode === courseCode)?.courseName,
          nameEn: (mappedNode.relatedCourses || []).find((c) => c.courseCode === courseCode)?.courseName,
          credits: (mappedNode.relatedCourses || []).find((c) => c.courseCode === courseCode)?.credits,
        }
      : null;

    if (!courseData) {
      return res.status(404).json({ error: 'COURSE_NOT_FOUND' });
    }

    const result = await aiContextService.getOrGenerateContext(
      courseCode,
      roadmap.roadmapName || 'career-track',
      courseData
    );

    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
}

async function getNodeMarketSkills(req, res, next) {
  try {
    const { courseCode } = req.params;

    const skills = await marketSkillService.getMarketSkills(courseCode);
    res.json(skills);
  } catch (err) {
    handleError(err, res);
  }
}

async function getSkillLearningResources(req, res, next) {
  try {
    const { skillName } = req.params;

    if (!skillName) {
      return res.status(400).json({ error: 'MISSING_SKILL_NAME' });
    }

    const resources = await marketSkillService.getLearningResources(decodeURIComponent(skillName));
    res.json(resources);
  } catch (err) {
    handleError(err, res);
  }
}

function handleError(err, res) {
  if (err.status) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message,
    },
  });
}

module.exports = {
  getTree,
  patchNodeStatus,
  getRoadmapProgress,
  getNodeResources,
  getNodeWhy,
  getNodeMarketSkills,
  getSkillLearningResources,
  handleError,
};
