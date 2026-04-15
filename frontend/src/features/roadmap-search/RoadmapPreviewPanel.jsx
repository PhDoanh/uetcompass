import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildRoadmapPreviewGraph } from './roadmapSearch.graph';

export default function RoadmapPreviewPanel({ previewData, previewStatus = 'idle', errorMessage = '' }) {
    const { flowNodes, flowEdges } = useMemo(() => buildRoadmapPreviewGraph(previewData?.nodes || []), [previewData]);

    if (previewStatus === 'loading') {
        return <p style={{ color: '#64748b' }}>Loading preview...</p>;
    }

    if (previewStatus === 'error') {
        return <p style={{ color: '#b91c1c' }}>{errorMessage || 'Unable to load roadmap preview.'}</p>;
    }

    if (!previewData) {
        return <p style={{ color: '#64748b' }}>Select a roadmap to preview details.</p>;
    }

    if (!Array.isArray(previewData.nodes) || previewData.nodes.length === 0) {
        return (
            <div className="roadmap-preview-panel" aria-label="Roadmap preview panel">
                <h2 style={{ marginTop: 0 }}>{previewData.title || 'Roadmap Preview'}</h2>
                <p style={{ color: '#64748b' }}>{previewData.description || 'No description available.'}</p>
                <p style={{ color: '#64748b' }}>No nodes to preview yet.</p>
            </div>
        );
    }

    return (
        <div className="roadmap-preview-panel" aria-label="Roadmap preview panel">
            <h2 style={{ marginTop: 0 }}>{previewData.title || 'Roadmap Preview'}</h2>
            <p style={{ color: '#64748b' }}>{previewData.description || 'No description available.'}</p>
            <div style={{ width: '100%', height: '100%', minHeight: 560, borderRadius: 16, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <ReactFlow nodes={flowNodes} edges={flowEdges} fitView defaultEdgeOptions={{ type: 'straight' }} attributionPosition="bottom-left">
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}
