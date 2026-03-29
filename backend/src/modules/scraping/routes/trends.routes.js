/**
 * T029: Market Trends Routes (User Story 2)
 * REST endpoints for market trends
 */

const express = require('express');
const router = express.Router();
const trendsController = require('../controllers/trends.controller');
const { verifyToken } = require('../../../middleware/auth.middleware'); // Adjust path as needed

/**
 * GET /api/market/trends
 * Returns all active market trends
 */
router.get(
  '/',
  verifyToken,
  trendsController.getAllTrends
);

/**
 * GET /api/market/trends/:roadmapNodeId
 * Returns trends for a specific node
 */
router.get(
  '/:roadmapNodeId',
  verifyToken,
  trendsController.getTrendsByNode
);

module.exports = router;
