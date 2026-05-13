import React from 'react';

/**
 * T024: Build custom course node UI with status badges and lock indicator
 */

export default function CourseNode({ node, onSelect = () => {}, onContextMenu = () => {} }) {
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
  const relatedCount = (node.relatedCourses || []).length;

  return (
    <button
      onClick={onSelect}
      onContextMenu={(event) => onContextMenu(event, node)}
      className={`course-node roadmap-node ${isSubtopic ? 'roadmap-node-sub' : 'roadmap-node-main'} ${getStatusVariant()}`}
    >
      <div className="course-node__main">
        <div className="course-node__text">
          <h3 className="course-node__code">{node.skillName}</h3>
        </div>
      </div>
      {!isSubtopic && relatedCount > 0 && (
        <div className="course-node__credits">
          {relatedCount} related course{relatedCount !== 1 ? 's' : ''}
        </div>
      )}
    </button>
  );
}
