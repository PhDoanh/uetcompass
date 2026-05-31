'use strict';

const path = require('path');
const fs = require('fs');

// Load all roadmap templates from data/*.json, keyed by roadmapName (case-insensitive)
const DATA_DIR = path.join(__dirname, '../../..', 'data');
const ROADMAP_TEMPLATES = new Map();

for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
	try {
		const data = require(path.join(DATA_DIR, file));
		if (data.roadmapName && Array.isArray(data.nodes) && data.nodes.length > 0) {
			ROADMAP_TEMPLATES.set(data.roadmapName.toLowerCase(), data.nodes);
		}
	} catch {
		// skip malformed files
	}
}

module.exports = { ROADMAP_TEMPLATES };
