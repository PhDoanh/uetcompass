const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./skillTree.controller');

/**
 * T012: Create authenticated router for all Skill Tree endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// US1 — View tree
router.get('/', controller.getTree);

// US2/US3 — Progress read/update by roadmap and nodeId
router.get('/roadmaps/:roadmapId/progress', controller.getRoadmapProgress);
router.patch('/roadmaps/:roadmapId/progress/node', controller.patchNodeStatus);

// US3 — Course detail panel resources
router.get('/nodes/:courseCode/resources', controller.getNodeResources);
router.get('/nodes/:courseCode/why', controller.getNodeWhy);
router.get('/nodes/:courseCode/market-skills', controller.getNodeMarketSkills);

// US4 — Skill drill-down resources
router.get('/skills/:skillName/learning-resources', controller.getSkillLearningResources);

// Note: Repersonalize is handled by Feature 005 (Account Management)
// which calls Feature 009 endpoint directly: POST /api/roadmaps/primary/regenerate
// Skill Tree fetches updated roadmap via GET /api/skill-tree after 009 completes

module.exports = router;
