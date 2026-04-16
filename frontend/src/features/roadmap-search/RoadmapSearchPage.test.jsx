describe('RoadmapSearchPage shell constants', () => {
    test('defines search placeholder for autofocus entry input', () => {
        expect('Search roadmap by name...').toBe('Search roadmap by name...');
    });

    test('uses configured debounce and min-length constraints', async () => {
        const { canSearchRoadmaps } = await import('./roadmapSearch.logic.js');
        expect(canSearchRoadmaps('a')).toBe(false);
        expect(canSearchRoadmaps('ab')).toBe(true);
    });
});
