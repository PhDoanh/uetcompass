'use strict';

const path = require('path');

// Load roadmap templates keyed by roadmapName (case-insensitive)
const templateData = require(path.join(__dirname, '../../..', 'data', 'backend.json'));
const ROADMAP_TEMPLATES = new Map();
if (templateData.roadmapName && templateData.nodes) {
	ROADMAP_TEMPLATES.set(templateData.roadmapName.toLowerCase(), templateData.nodes);
}

module.exports = { ROADMAP_TEMPLATES };
