const express = require('express');
const searchController = require('./search.controller');

const router = express.Router();

// POST /api/search/query
router.post('/query', searchController.query);

module.exports = router;
