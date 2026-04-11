const crypto = require('crypto');

function normalizeHeader(value) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hashContent(content) {
	return crypto.createHash('sha256').update(content || '').digest('hex');
}

function hasSnapshotChanged(previous = {}, current = {}) {
	const etagChanged = previous.httpEtag && current.httpEtag && previous.httpEtag !== current.httpEtag;
	const modifiedChanged =
		previous.lastModified && current.lastModified && previous.lastModified !== current.lastModified;
	const hashChanged = previous.contentHash && current.contentHash && previous.contentHash !== current.contentHash;

	if (!previous.httpEtag && !previous.lastModified && !previous.contentHash) {
		return true;
	}

	return Boolean(etagChanged || modifiedChanged || hashChanged);
}

async function defaultHeadFetcher(url) {
	const res = await fetch(url, { method: 'HEAD' });
	if (!res.ok) {
		throw new Error(`HEAD request failed for ${url} with status ${res.status}`);
	}
	return res.headers;
}

async function buildCurrentSnapshot(url, { headFetcher = defaultHeadFetcher, extractContent }) {
	const headers = await headFetcher(url);
	const content = await extractContent(url);

	return {
		url,
		httpEtag: normalizeHeader(headers.get('etag')),
		lastModified: normalizeHeader(headers.get('last-modified')),
		contentHash: hashContent(content),
		checkedAt: new Date(),
		markdown: content,
	};
}

module.exports = {
	normalizeHeader,
	hashContent,
	hasSnapshotChanged,
	defaultHeadFetcher,
	buildCurrentSnapshot,
};
