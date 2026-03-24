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
      className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
        repersonalizing
          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
      }`}
    >
      <RefreshCw className={`w-4 h-4 ${repersonalizing ? 'animate-spin' : ''}`} />
      {repersonalizing ? 'Re-personalizing...' : 'Re-personalize'}
    </button>
  );
}
