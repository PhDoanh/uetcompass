import React from 'react';

export default function RoadmapSearchResults({ results = [], resultsStatus = 'idle', selectedRoadmapId = null, onSelectResult }) {
    if (resultsStatus === 'searching') {
        return <p className="roadmap-search-results__state">Searching roadmaps...</p>;
    }

    if (resultsStatus === 'error') {
        return <p className="roadmap-search-results__state roadmap-search-results__state--error">Search failed. Please try again.</p>;
    }

    if (resultsStatus === 'empty') {
        return <p className="roadmap-search-results__state">No matching roadmaps found.</p>;
    }

    return (
        <div className="roadmap-search-results" aria-label="Roadmap search results">
            {results.length === 0 ? (
                <p className="roadmap-search-results__state">Type at least 2 characters to search.</p>
            ) : (
                <div className="roadmap-search-results__list">
                    {results.map((result) => {
                        const isSelected = result._id === selectedRoadmapId;
                        return (
                            <button
                                key={result._id}
                                type="button"
                                className={`roadmap-search-results__card ${isSelected ? 'is-selected' : ''}`}
                                onClick={() => onSelectResult?.(result._id)}
                            >
                                <div className="roadmap-search-results__card-body">
                                    <strong className="roadmap-search-results__card-title">{result.title}</strong>
                                    <p className="roadmap-search-results__card-description">{result.description || 'No description'}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
