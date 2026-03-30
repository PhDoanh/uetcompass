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
  '/trends',
  verifyToken,
  trendsController.getAllTrends
);

/**
 * GET /api/market/trends/course/:courseName
 * Returns trends for a specific course
 */
router.get(
  '/trends/course/:courseName',
  verifyToken,
  trendsController.getTrendsByCourse
);

module.exports = router;
