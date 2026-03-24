import React from 'react';
import CourseNode from './CourseNode';

/**
 * T023: Build React Flow canvas for skill tree visualization
 * For now: simplified grid layout without React Flow (can be enhanced later)
 */

export default function SkillTreeCanvas({ nodes = [], onSelectNode = () => {} }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No nodes available</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <CourseNode
            key={node.courseCode}
            node={node}
            onSelect={() => onSelectNode(node.courseCode)}
          />
        ))}
      </div>
    </div>
  );
}
