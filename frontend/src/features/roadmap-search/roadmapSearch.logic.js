export function normalizeRoadmapQuery(query) {
    return String(query || '').trim();
}

export function canSearchRoadmaps(query) {
    return normalizeRoadmapQuery(query).length >= 2;
}

export const ROADMAP_SEARCH_RESULTS_PAGE_SIZE = 3;

export function clampRoadmapResultsStartIndex(startIndex, resultsLength, pageSize = ROADMAP_SEARCH_RESULTS_PAGE_SIZE) {
    const normalizedPageSize = Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : ROADMAP_SEARCH_RESULTS_PAGE_SIZE);

    if (!Number.isFinite(resultsLength) || resultsLength <= 0) {
        return 0;
    }

    const maxStartIndex = Math.max(0, Math.floor((resultsLength - 1) / normalizedPageSize) * normalizedPageSize);
    const normalizedStartIndex = Number.isFinite(startIndex) ? Math.floor(startIndex) : 0;

    return Math.min(Math.max(normalizedStartIndex, 0), maxStartIndex);
}

export function getPagedRoadmapResults(results = [], startIndex = 0, pageSize = ROADMAP_SEARCH_RESULTS_PAGE_SIZE) {
    if (!Array.isArray(results) || results.length === 0) {
        return [];
    }

    const normalizedPageSize = Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : ROADMAP_SEARCH_RESULTS_PAGE_SIZE);
    const normalizedStartIndex = clampRoadmapResultsStartIndex(startIndex, results.length, normalizedPageSize);

    return results.slice(normalizedStartIndex, normalizedStartIndex + normalizedPageSize);
}

export function getRoadmapResultsWindowStartIndex(results = [], selectedRoadmapId = null, pageSize = ROADMAP_SEARCH_RESULTS_PAGE_SIZE) {
    if (!Array.isArray(results) || results.length === 0) {
        return 0;
    }

    const normalizedPageSize = Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : ROADMAP_SEARCH_RESULTS_PAGE_SIZE);
    const selectedIndex = results.findIndex((result) => result?._id === selectedRoadmapId);

    if (selectedIndex < 0) {
        return 0;
    }

    const windowStartIndex = Math.floor(selectedIndex / normalizedPageSize) * normalizedPageSize;

    return clampRoadmapResultsStartIndex(windowStartIndex, results.length, normalizedPageSize);
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
