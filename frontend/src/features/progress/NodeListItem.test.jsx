describe('NodeListItem deep-link builder', () => {
  function buildSkillTreeFocusHref(roadmapId, nodeId) {
    const safeRoadmapId = encodeURIComponent(String(roadmapId || ''));
    const safeNodeId = encodeURIComponent(String(nodeId || ''));
    return `/skill-tree/${safeRoadmapId}?focus=${safeNodeId}`;
  }

  test('builds focus URL with roadmap and node ids', () => {
    expect(buildSkillTreeFocusHref('roadmap-1', 'node-2')).toBe('/skill-tree/roadmap-1?focus=node-2');
  });

  test('encodes unsafe URL characters', () => {
    expect(buildSkillTreeFocusHref('road map', 'node/2')).toBe('/skill-tree/road%20map?focus=node%2F2');
  });
});
