import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * T060: Repersonalize CTA button with disabled/loading state
 */

export default function RepersonalizeButton({
  repersonalizing = false,
  onRepersonalize = () => {},
}) {
  return (
    <button
      onClick={onRepersonalize}
      disabled={repersonalizing}
      className={`skill-tree-repersonalize-btn ${repersonalizing ? 'is-loading' : ''}`}
    >
      <RefreshCw size={16} className={repersonalizing ? 'is-spinning' : ''} />
      {repersonalizing ? 'Regenerating roadmap...' : 'Regenerate Roadmap'}
    </button>
  );
}
