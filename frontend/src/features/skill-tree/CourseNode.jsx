import React from 'react';

/**
 * T024: Build custom course node UI with status badges and lock indicator
 */

export default function CourseNode({ node, onSelect = () => {} }) {
  const getStatusVariant = () => {
    switch (node.progressState) {
      case 'completed':
        return 'node-color-done';
      case 'inProgress':
        return 'node-color-progress';
      case 'skip':
        return 'node-color-skip';
      default:
        return 'node-color-neutral';
    }
  };

  const isSubtopic = node.nodeType === 'subtopic';

  return (
    <button
      onClick={onSelect}
      className={`course-node roadmap-node ${isSubtopic ? 'roadmap-node-sub' : 'roadmap-node-main'} ${getStatusVariant()}`}
    >
      <div className="course-node__main">
        <div className="course-node__text">
          <h3 className="course-node__code">{node.skillName}</h3>
        </div>
      </div>
      {!isSubtopic && (node.relatedCourses || []).length > 0 && (
        <div className="course-node__credits">
          {(node.relatedCourses || []).length} related course{(node.relatedCourses || []).length > 1 ? 's' : ''}
        </div>
      )}
    </button>
  );
}
