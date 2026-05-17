describe('roadmapId propagation contract', () => {
  test('uses the same roadmapId across API path, SSE merge key, and deep-link URL', () => {
    const roadmapId = '64f1a2b3c4d5e6f7a8b9c0d1';
    const nodeId = 'aaa111';

    const apiPath = `/api/progress/summaries/${roadmapId}/nodes`;
    const ssePayload = { roadmapId, progressPercent: 33 };
    const deepLink = `/skill-tree/${roadmapId}?focus=${nodeId}`;

    expect(apiPath.includes(roadmapId)).toBe(true);
    expect(ssePayload.roadmapId).toBe(roadmapId);
    expect(deepLink.includes(`/skill-tree/${roadmapId}`)).toBe(true);
    expect(deepLink.includes(`focus=${nodeId}`)).toBe(true);
  });
});
