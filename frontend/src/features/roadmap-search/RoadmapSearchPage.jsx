import React, { useEffect } from 'react';
import RoadmapSearchResults from './RoadmapSearchResults';
import RoadmapPreviewPanel from './RoadmapPreviewPanel';
import { useRoadmapSearch } from './useRoadmapSearch';

export const ROADMAP_SEARCH_PLACEHOLDER = 'Search roadmap by name...';
export const ROADMAP_SEARCH_DEBOUNCE_MS = 300;
export const ROADMAP_SEARCH_MIN_LENGTH = 2;

export default function RoadmapSearchPage() {
    const {
        results,
        selectedRoadmapId,
        setSelectedRoadmapId,
        resultsStatus,
        previewStatus,
        previewData,
        errorMessage,
    } = useRoadmapSearch('');

    useEffect(() => {
        const navbarInput = window.document.querySelector('.navbar__input');
        if (navbarInput && typeof navbarInput.focus === 'function') {
            navbarInput.focus();
        }
    }, []);

    return (
        <main className="roadmap-search-page">
            <section className="roadmap-search-page__left">
                {errorMessage ? (
                    <p style={{ color: '#b91c1c', marginTop: 0, marginBottom: '12px' }}>{errorMessage}</p>
                ) : null}
                <p style={{ color: '#64748b', marginTop: 0, marginBottom: '12px' }}>
                    Use the navbar search field above to search roadmap names.
                </p>
                <RoadmapSearchResults
                    results={results}
                    resultsStatus={resultsStatus}
                    selectedRoadmapId={selectedRoadmapId}
                    onSelectResult={setSelectedRoadmapId}
                />
            </section>
            <section className="roadmap-search-page__right">
                <RoadmapPreviewPanel
                    previewData={previewData}
                    previewStatus={previewStatus}
                    errorMessage={errorMessage}
                />
            </section>
        </main>
    );
}
