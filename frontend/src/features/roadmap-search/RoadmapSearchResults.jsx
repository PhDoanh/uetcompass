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
                        const nodeDetails = Array.isArray(result.nodeDetails) ? result.nodeDetails : [];
                        const nodePreviewItems = nodeDetails.slice(0, 3);
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
                                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.9rem' }}>{result.description || 'No description'}</p>
                                <p style={{ margin: '0 0 8px', color: '#334155', fontSize: '0.82rem', fontWeight: 600 }}>
                                    Nodes: {nodeDetails.length}
                                </p>
                                {nodePreviewItems.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                        {nodePreviewItems.map((node, index) => (
                                            <div key={`${result._id}-node-${node.nodeId || index}`} style={{ borderTop: '1px dashed #dbe3ef', paddingTop: '6px' }}>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f172a', fontWeight: 600 }}>
                                                    {node.label || node.skillName || node.nodeId || 'Node'}
                                                </p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                                                    {node.description || node.reason || 'No node description'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>No node details available.</p>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
