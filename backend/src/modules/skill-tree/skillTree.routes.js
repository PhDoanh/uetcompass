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

// US2 — Update node status
router.patch('/nodes/:courseCode/status', controller.patchNodeStatus);

// US3 — Course detail panel resources
router.get('/nodes/:courseCode/resources', controller.getNodeResources);
router.get('/nodes/:courseCode/why', controller.getNodeWhy);
router.get('/nodes/:courseCode/market-skills', controller.getNodeMarketSkills);

// US4 — Skill drill-down resources
router.get('/skills/:skillName/learning-resources', controller.getSkillLearningResources);

// US5 — Repersonalize
router.post('/repersonalize', controller.postRepersonalize);

module.exports = router;
