'use strict';

const crypto = require('crypto');

function canonicalizeNodes(nodes = []) {
	return (Array.isArray(nodes) ? nodes : [])
		.map((node) => ({
			courseCode: String(node?.courseCode || '').trim(),
			courseName: String(node?.courseName || '').trim(),
			skills: [...(node?.skills || [])].map((s) => String(s).trim()).sort(),
			reason: String(node?.reason || '').trim(),
			major: node?.major ? String(node.major).trim() : null,
		}))
		.sort((a, b) => {
			if (a.courseCode !== b.courseCode) return a.courseCode.localeCompare(b.courseCode);
			return a.reason.localeCompare(b.reason);
		});
}

function computeSnapshotHash(nodes = []) {
	const canonical = JSON.stringify(canonicalizeNodes(nodes));
	return crypto.createHash('sha256').update(canonical).digest('hex');
}

module.exports = {
	canonicalizeNodes,
	computeSnapshotHash,
};
