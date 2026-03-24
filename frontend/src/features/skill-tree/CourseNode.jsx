import React from 'react';
import { Lock, CheckCircle, Circle } from 'lucide-react';

/**
 * T024: Build custom course node UI with status badges and lock indicator
 */

export default function CourseNode({ node, onSelect = () => {} }) {
  const getStatusColor = () => {
    switch (node.status) {
      case 'done':
        return 'bg-green-100 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 border-blue-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (node.status) {
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Circle className="w-5 h-5 text-blue-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <button
      onClick={onSelect}
      disabled={!node.isUnlocked}
      className={`p-4 border-2 rounded-lg text-left transition-all ${getStatusColor()} ${
        !node.isUnlocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{node.courseCode}</h3>
          <p className="text-sm text-gray-700 mt-1">{node.nameVi}</p>
          {node.nameEn && <p className="text-xs text-gray-500">{node.nameEn}</p>}
        </div>
        <div className="ml-2 flex-shrink-0">
          {!node.isUnlocked ? (
            <Lock className="w-5 h-5 text-red-600" />
          ) : (
            getStatusIcon()
          )}
        </div>
      </div>
      {node.credits && (
        <div className="mt-2 text-xs text-gray-600">
          {node.credits} credits
        </div>
      )}
      {node.prerequisites && node.prerequisites.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Prerequisites: {node.prerequisites.join(', ')}
        </div>
      )}
    </button>
  );
}
