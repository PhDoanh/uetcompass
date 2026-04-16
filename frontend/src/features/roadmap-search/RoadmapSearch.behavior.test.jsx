describe('roadmap search behavior', () => {
    test('requires at least two characters before searching', async () => {
        const { canSearchRoadmaps, normalizeRoadmapQuery } = await import('./roadmapSearch.logic.js');

        expect(normalizeRoadmapQuery('  a  ')).toBe('a');
        expect(canSearchRoadmaps('a')).toBe(false);
        expect(canSearchRoadmaps('ab')).toBe(true);
    });

    test('chooses the first result after a successful search', async () => {
        const { getInitialSelectedRoadmapId } = await import('./roadmapSearch.logic.js');

        expect(
            getInitialSelectedRoadmapId([
                { _id: 'r1', title: 'Alpha' },
                { _id: 'r2', title: 'Beta' },
            ])
        ).toBe('r1');
    });
});
