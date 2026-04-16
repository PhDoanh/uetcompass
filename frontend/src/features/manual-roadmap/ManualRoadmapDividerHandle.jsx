import React from 'react';

export default function ManualRoadmapDividerHandle() {
    return (
        <span className="manual-roadmap-layout__divider-handle" aria-hidden="true">
            <span className="manual-roadmap-layout__divider-arrow manual-roadmap-layout__divider-arrow--left material-symbols-outlined">chevron_left</span>
            <span className="manual-roadmap-layout__divider-grip" />
            <span className="manual-roadmap-layout__divider-arrow manual-roadmap-layout__divider-arrow--right material-symbols-outlined">chevron_right</span>
        </span>
    );
}