/**
 * T015: Academic Materials Routes (User Story 1)
 * REST endpoints for academic materials
 */

const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academic.controller');
const { verifyToken } = require('../../../middleware/auth.middleware');

/**
 * GET /api/resources/academic/:courseCode
 * Returns academic materials for a course
 * Authorization required: Bearer token
 */
router.get(
  '/academic/:courseCode',
  verifyToken,
  academicController.getAcademicByCourse
);

module.exports = router;
