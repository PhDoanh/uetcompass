import React from 'react';
import { Lock, CheckCircle, Circle } from 'lucide-react';

/**
 * T024: Build custom course node UI with status badges and lock indicator
 */

export default function CourseNode({ node, onSelect = () => {} }) {
  const getStatusVariant = () => {
    switch (node.status) {
      case 'done':
        return 'is-done';
      case 'in_progress':
        return 'is-in-progress';
      default:
        return 'is-pending';
    }
  };

  const getStatusIcon = () => {
    switch (node.status) {
      case 'done':
        return <CheckCircle size={18} />;
      case 'in_progress':
        return <Circle size={18} />;
      default:
        return <Circle size={18} />;
    }
  };

  return (
    <button
      onClick={onSelect}
      disabled={!node.isUnlocked}
      className={`course-node ${getStatusVariant()} ${!node.isUnlocked ? 'is-locked' : ''}`}
    >
      <div className="course-node__main">
        <div className="course-node__text">
          <h3 className="course-node__code">{node.courseCode}</h3>
          <p className="course-node__name-vi">{node.nameVi}</p>
          {node.nameEn && <p className="course-node__name-en">{node.nameEn}</p>}
        </div>
        <div className="course-node__icon">
          {!node.isUnlocked ? (
            <Lock size={18} />
          ) : (
            getStatusIcon()
          )}
        </div>
      </div>
      {node.credits && (
        <div className="course-node__credits">
          {node.credits} credits
        </div>
      )}
      {node.prerequisites && node.prerequisites.length > 0 && (
        <div className="course-node__prerequisites">
          Prerequisites: {node.prerequisites.join(', ')}
        </div>
      )}
    </button>
  );
}
