export function normalizeRoadmapQuery(query) {
    return String(query || '').trim();
}

export function canSearchRoadmaps(query) {
    return normalizeRoadmapQuery(query).length >= 2;
}

/** Stable key for dependency arrays when filtering by selected tags. */
export function selectedTagsSignature(tags = []) {
    if (!Array.isArray(tags)) {
        return '';
    }
    const labels = tags
        .map((t) => String(t?.normalizedLabel || '').trim().toLowerCase())
        .filter(Boolean);
    return [...new Set(labels)].sort().join('|');
}

/** Run API search when name query is long enough or at least one tag filter is set. */
export function shouldRunRoadmapSearch(nameQuery, tags = []) {
    const q = normalizeRoadmapQuery(nameQuery);
    const hasTags = Array.isArray(tags) && tags.length > 0;
    if (hasTags) {
        return true;
    }
    return q.length >= 2;
}

export function getInitialSelectedRoadmapId(results) {
    return Array.isArray(results) && results.length > 0 ? results[0]._id : null;
}

export function getSelectedRoadmap(results, selectedRoadmapId) {
    return Array.isArray(results)
        ? results.find((result) => result._id === selectedRoadmapId) || null
        : null;
}
