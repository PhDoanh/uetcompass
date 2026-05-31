import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ManualRoadmapDividerHandle() {
    return (
        <span className="manual-roadmap-layout__divider-handle" aria-hidden="true">
            <ChevronLeft className="manual-roadmap-layout__divider-arrow manual-roadmap-layout__divider-arrow--left" />
            <span className="manual-roadmap-layout__divider-grip" />
            <ChevronRight className="manual-roadmap-layout__divider-arrow manual-roadmap-layout__divider-arrow--right" />
        </span>
    );
}