import React from 'react';

export default function RoadmapSearchResults({ results = [], resultsStatus = 'idle', selectedRoadmapId = null, onSelectResult }) {
    if (resultsStatus === 'searching') {
        return <p style={{ color: '#64748b', margin: 0 }}>Searching roadmaps...</p>;
    }

    if (resultsStatus === 'error') {
        return <p style={{ color: '#b91c1c', margin: 0 }}>Search failed. Please try again.</p>;
    }

    if (resultsStatus === 'empty') {
        return <p style={{ color: '#64748b', margin: 0 }}>No matching roadmaps found.</p>;
    }

    return (
        <div className="roadmap-search-results" aria-label="Roadmap search results">
            {results.length === 0 ? (
                <p style={{ color: '#64748b', margin: 0 }}>Type at least 2 characters to search.</p>
            ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                    {results.map((result) => {
                        const isSelected = result._id === selectedRoadmapId;
                        return (
                            <button
                                key={result._id}
                                type="button"
                                onClick={() => onSelectResult?.(result._id)}
                                style={{
                                    textAlign: 'left',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid #0055A2' : '1px solid #cbd5e1',
                                    background: isSelected ? '#e0f2fe' : '#ffffff',
                                    cursor: 'pointer',
                                }}
                            >
                                <strong style={{ display: 'block', marginBottom: '4px' }}>{result.title}</strong>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{result.description || 'No description'}</p>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
