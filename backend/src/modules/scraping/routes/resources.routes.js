/**
 * T041: Resources Routes (User Story 3)
 * REST endpoints for learning resources
 */

const express = require('express');
const router = express.Router();
const resourcesController = require('../controllers/resources.controller');
const { verifyToken } = require('../../../middleware/auth.middleware'); // Adjust path as needed

/**
 * GET /api/resources/skills/:skillName
 * Returns learning resources for a skill
 */
router.get(
  '/skills/:skillName',
  verifyToken,
  resourcesController.getResourcesBySkillName
);

/**
 * POST /api/resources/crawl/trigger
 * Trigger crawl-and-store sequence from Feature 009
 */
router.post(
  '/crawl/trigger',
  verifyToken,
  resourcesController.triggerCurationFromRoadmap
);

module.exports = router;
