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
        <div className="roadmap-search-page">
            <section className="roadmap-search-page__left">
                <div className="roadmap-search-page__section-header">
                    <div>
                        <h2 className="roadmap-search-page__title">Roadmaps</h2>
                        <p className="roadmap-search-page__subtitle">
                            Find public manual roadmaps by name, then preview them on the right.
                        </p>
                    </div>
                </div>
                {errorMessage ? (
                    <p className="roadmap-search-page__error">{errorMessage}</p>
                ) : null}
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
        </div>
    );
}
