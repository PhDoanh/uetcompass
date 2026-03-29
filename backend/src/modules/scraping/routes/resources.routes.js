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

module.exports = router;
