import { describe, expect, test } from 'vitest';

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

    test('pages search results in windows of three', async () => {
        const {
            getPagedRoadmapResults,
            getRoadmapResultsWindowStartIndex,
            clampRoadmapResultsStartIndex,
            ROADMAP_SEARCH_RESULTS_PAGE_SIZE,
        } = await import('./roadmapSearch.logic.js');

        const results = [
            { _id: 'r1', title: 'Alpha' },
            { _id: 'r2', title: 'Beta' },
            { _id: 'r3', title: 'Gamma' },
            { _id: 'r4', title: 'Delta' },
            { _id: 'r5', title: 'Epsilon' },
        ];

        expect(ROADMAP_SEARCH_RESULTS_PAGE_SIZE).toBe(3);
        expect(getPagedRoadmapResults(results, 0).map((result) => result._id)).toEqual(['r1', 'r2', 'r3']);
        expect(getPagedRoadmapResults(results, 3).map((result) => result._id)).toEqual(['r4', 'r5']);
        expect(clampRoadmapResultsStartIndex(99, results.length)).toBe(3);
        expect(getRoadmapResultsWindowStartIndex(results, 'r4')).toBe(3);
    });
});
