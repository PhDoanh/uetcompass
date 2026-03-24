const skillTreeService = require('./skillTree.service');
const courseResourceService = require('./courseResource.service');
const marketSkillService = require('./marketSkill.service');
const aiContextService = require('./aiContext.service');
const primaryRoadmapService = require('./primaryRoadmap.service');
const { validateCourseCode } = require('./skillTree.validation');

/**
 * T011: Create base controller with error mapping and response helpers
 * T041: Implement all endpoint handlers
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
    const { courseCode } = req.params;
    const { status } = req.body;

    const validation = validateCourseCode(courseCode);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updated = await skillTreeService.updateNodeStatus(userId, courseCode, status);
    res.json({ status: updated.status, updatedAt: updated.updatedAt });
  } catch (err) {
    handleError(err, res);
  }
}

async function getNodeResources(req, res, next) {
  try {
    const { courseCode } = req.params;

    const validation = validateCourseCode(courseCode);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

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

    const validation = validateCourseCode(courseCode);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Get roadmap to find course data
    const roadmap = await primaryRoadmapService.getPrimaryRoadmap(userId);
    const courseData = roadmap.nodes.find((n) => n.nodeId === courseCode || n.courseCode === courseCode);

    if (!courseData) {
      return res.status(404).json({ error: 'COURSE_NOT_FOUND' });
    }

    const result = await aiContextService.getOrGenerateContext(
      courseCode,
      roadmap.careerGoal,
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

    const validation = validateCourseCode(courseCode);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

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

async function postRepersonalize(req, res, next) {
  try {
    const userId = req.user.userId;

    // Check if repersonalization is already in progress
    const tree = await skillTreeService.getSkillTree(userId);
    if (tree.repersonalizing) {
      return res.status(409).json({ error: 'REPERSONALIZATION_IN_PROGRESS' });
    }

    // Delegate to Feature 009
    await primaryRoadmapService.triggerRepersonalize(userId);

    res.json({ repersonalizing: true });
  } catch (err) {
    handleError(err, res);
  }
}

function handleError(err, res) {
  if (err.status) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message,
  });
}

module.exports = {
  getTree,
  patchNodeStatus,
  getNodeResources,
  getNodeWhy,
  getNodeMarketSkills,
  getSkillLearningResources,
  postRepersonalize,
  handleError,
};
