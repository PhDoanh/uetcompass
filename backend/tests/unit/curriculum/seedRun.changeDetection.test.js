const {
	hasSnapshotChanged,
	hashContent,
	buildCurrentSnapshot,
} = require('../../../src/modules/curriculum/change-detection');

describe('change detection helpers', () => {
	test('detects no change for equal snapshot fields', () => {
		const prev = { httpEtag: 'a', lastModified: 'b', contentHash: 'c' };
		const next = { httpEtag: 'a', lastModified: 'b', contentHash: 'c' };
		expect(hasSnapshotChanged(prev, next)).toBe(false);
	});

	test('detects change when hash differs', () => {
		const prev = { contentHash: 'x' };
		const next = { contentHash: 'y' };
		expect(hasSnapshotChanged(prev, next)).toBe(true);
	});

	test('builds snapshot from head headers and extracted content', async () => {
		const snapshot = await buildCurrentSnapshot('https://example.com', {
			headFetcher: async () => ({ get: (k) => (k === 'etag' ? 'etag1' : null) }),
			extractContent: async () => 'hello',
		});

		expect(snapshot.url).toBe('https://example.com');
		expect(snapshot.httpEtag).toBe('etag1');
		expect(snapshot.contentHash).toBe(hashContent('hello'));
	});
});
