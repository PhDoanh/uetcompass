describe('roadmap preview behavior', () => {
    test('builds a flow graph from roadmap nodes', async () => {
        const { buildRoadmapPreviewGraph } = await import('./roadmapSearch.graph.js');

        const { flowNodes, flowEdges } = buildRoadmapPreviewGraph([
            { nodeId: 'a', label: 'Alpha', prerequisites: [] },
            { nodeId: 'b', label: 'Beta', prerequisites: ['a'] },
        ]);

        expect(flowNodes).toHaveLength(2);
        expect(flowEdges).toHaveLength(1);
        expect(flowEdges[0].type).toBe('straight');
    });

    test('returns selected roadmap from results list', async () => {
        const { getSelectedRoadmap } = await import('./roadmapSearch.logic.js');

        const results = [
            { _id: 'r1', title: 'Alpha' },
            { _id: 'r2', title: 'Beta' },
        ];

        expect(getSelectedRoadmap(results, 'r2')).toEqual({ _id: 'r2', title: 'Beta' });
    });

    test('returns null when selected roadmap does not exist', async () => {
        const { getSelectedRoadmap } = await import('./roadmapSearch.logic.js');

        expect(getSelectedRoadmap([], 'missing')).toBeNull();
    });
});
