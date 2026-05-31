'use strict';

const yaml = require('js-yaml');

const MAX_YAML_SIZE = 10240;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_NODE_DESCRIPTION = 200;

const VALID_TYPES = new Set(['main_topic', 'sub_topic', 'group_container', 'choice_item']);

function normalizeType(rawType) {
	const type = String(rawType || '').trim();
	if (type === 'topic') return 'main_topic';
	if (type === 'subtopic') return 'sub_topic';
	if (VALID_TYPES.has(type)) return type;
	return 'main_topic';
}

function normalizeString(value, maxLength) {
	const normalized = String(value || '').trim();
	if (!maxLength) return normalized;
	return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizeStringArray(values) {
	if (!Array.isArray(values)) return [];
	const unique = new Set();
	for (const value of values) {
		const normalized = String(value || '').trim();
		if (normalized) unique.add(normalized);
	}
	return Array.from(unique);
}

function buildNodeEntry(node, options) {
	if (!node || typeof node !== 'object') return null;

	const nodeId = normalizeString(node.nodeId || node.id, null);
	const label = normalizeString(node.label || node.skillName || nodeId, null);

	if (!nodeId || !label) return null;

	const entry = {
		nodeId,
		label,
		type: normalizeType(node.type || node.nodeType),
	};

	const parentNodeId = normalizeString(node.parentNodeId || node.parent, null);
	if (parentNodeId) entry.parentNodeId = parentNodeId;

	if (options.includeDescription) {
		const description = normalizeString(node.description, MAX_NODE_DESCRIPTION);
		if (description) entry.description = description;
	}

	if (options.includePrerequisites) {
		const prerequisites = normalizeStringArray(node.prerequisites);
		if (prerequisites.length > 0) entry.prerequisites = prerequisites;
	}

	if (options.includeSkillName) {
		const skillName = normalizeString(node.skillName, null);
		if (skillName) entry.skillName = skillName;
	}

	if (options.includeResources && Array.isArray(node.resources) && node.resources.length > 0) {
		entry.resources = node.resources;
	}

	if (options.includeMetadata && node.metadata && typeof node.metadata === 'object' && !Array.isArray(node.metadata)) {
		if (Object.keys(node.metadata).length > 0) {
			entry.metadata = node.metadata;
		}
	}

	return entry;
}

function renderYaml(title, description, nodes) {
	const payload = {
		title,
		description,
		nodes,
	};
	return yaml.dump(payload, { lineWidth: 300 });
}

function buildManualRoadmapYaml({ title, description, nodes }) {
	const safeTitle = normalizeString(title, MAX_TITLE_LENGTH) || 'Untitled Roadmap';
	const safeDescription = normalizeString(description, MAX_DESCRIPTION_LENGTH);
	const nodeList = Array.isArray(nodes) ? nodes : [];

	const variants = [
		{ includeDescription: true, includePrerequisites: true, includeResources: true, includeSkillName: true, includeMetadata: true },
		{ includeDescription: true, includePrerequisites: true, includeResources: false, includeSkillName: true, includeMetadata: false },
		{ includeDescription: true, includePrerequisites: false, includeResources: false, includeSkillName: false, includeMetadata: false },
		{ includeDescription: false, includePrerequisites: false, includeResources: false, includeSkillName: false, includeMetadata: false },
	];

	for (const options of variants) {
		const normalizedNodes = nodeList.map((node) => buildNodeEntry(node, options)).filter(Boolean);
		const yamlCode = renderYaml(
			safeTitle,
			options.includeDescription ? safeDescription : '',
			normalizedNodes
		);
		if (yamlCode.length <= MAX_YAML_SIZE) return yamlCode;
	}

	// As a last resort, trim nodes to keep YAML within the schema size limit.
	const minimalNodes = nodeList
		.map((node) => buildNodeEntry(node, {
			includeDescription: false,
			includePrerequisites: false,
			includeResources: false,
			includeSkillName: false,
			includeMetadata: false,
		}))
		.filter(Boolean);

	let trimmedNodes = minimalNodes.slice();
	let yamlCode = renderYaml(safeTitle, '', trimmedNodes);
	while (yamlCode.length > MAX_YAML_SIZE && trimmedNodes.length > 1) {
		trimmedNodes = trimmedNodes.slice(0, trimmedNodes.length - 1);
		yamlCode = renderYaml(safeTitle, '', trimmedNodes);
	}

	return yamlCode;
}

module.exports = { buildManualRoadmapYaml };
