import React from 'react';

export function buildSkillTreeFocusHref(roadmapId, nodeId) {
  const safeRoadmapId = encodeURIComponent(String(roadmapId || ''));
  const safeNodeId = encodeURIComponent(String(nodeId || ''));
  return `/skill-tree/${safeRoadmapId}?focus=${safeNodeId}`;
}

export default function NodeListItem({ roadmapId, node }) {
  const nodeId = node?.nodeId || node?.courseCode || '';
  const skillName = String(node?.skillName || '').trim();
  const courseName = String(node?.courseName || '').trim();
  const courseCode = String(node?.courseCode || '').trim();
  const displayTitle = skillName || courseName || courseCode || String(nodeId || 'Unknown Skill').trim();
  const displaySubtitle = courseName && courseName !== displayTitle
    ? courseName
    : (courseCode && courseCode !== displayTitle ? courseCode : '');

  return (
    <a
      href={buildSkillTreeFocusHref(roadmapId, nodeId)}
      className="block cursor-pointer rounded border border-gray-200 p-3 hover:bg-gray-50"
    >
      <div className="font-medium text-gray-900">{displayTitle}</div>
      {displaySubtitle ? (
        <div className="text-sm text-gray-700">{displaySubtitle}</div>
      ) : null}
    </a>
  );
}
