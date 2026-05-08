/**
 * T029: Market Trends Routes (User Story 2)
 * REST endpoints for market trends
 */

const express = require('express');
const router = express.Router();
const trendsController = require('../controllers/trends.controller');
const { requireAuth } = require('../../../middleware/auth.middleware');

/**
 * GET /api/market/trends
 * Returns all active market trends
 */
router.get(
  '/trends',
  requireAuth,
  trendsController.getAllTrends
);

/**
 * GET /api/market/trends/course/:courseName
 * Returns trends for a specific course
 */
router.get(
  '/trends/course/:courseName',
  requireAuth,
  trendsController.getTrendsByCourse
);

module.exports = router;
