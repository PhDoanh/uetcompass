export function getRoadmapIdFromLocation(searchValue) {
  const params = new URLSearchParams(searchValue || '');
  return params.get('roadmapId') || '';
}
