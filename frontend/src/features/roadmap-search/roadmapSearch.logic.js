export function normalizeRoadmapQuery(query) {
    return String(query || '').trim();
}

export function canSearchRoadmaps(query) {
    return normalizeRoadmapQuery(query).length >= 2;
}

export function getInitialSelectedRoadmapId(results) {
    return Array.isArray(results) && results.length > 0 ? results[0]._id : null;
}

export function getSelectedRoadmap(results, selectedRoadmapId) {
    return Array.isArray(results)
        ? results.find((result) => result._id === selectedRoadmapId) || null
        : null;
}
