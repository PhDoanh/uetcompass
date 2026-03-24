import React, { useEffect, useState } from 'react';
import { useSkillTree } from './useSkillTree';
import SkillTreeCanvas from './SkillTreeCanvas';
import CourseDetailPanel from './CourseDetailPanel';
import RepersonalizeButton from './RepersonalizeButton';

export default function SkillTreePage() {
  const {
    nodes,
    roadmapName,
    activeCourseId,
    activeTab,
    activeSkillName,
    needsRepersonalization,
    repersonalizing,
    loading,
    error,
    openCourse,
    closeCourse,
    setActiveTab,
    openSkill,
    closeSkill,
    transitionNode,
    triggerRepersonalize,
  } = useSkillTree();

  const activeCourse = nodes?.find((n) => n.courseCode === activeCourseId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Skill Tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error Loading Skill Tree</p>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Skill Tree</h1>
            {roadmapName && <p className="text-gray-600 mt-1">{roadmapName}</p>}
          </div>
          {needsRepersonalization && (
            <RepersonalizeButton
              repersonalizing={repersonalizing}
              onRepersonalize={triggerRepersonalize}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <SkillTreeCanvas
            nodes={nodes || []}
            onSelectNode={openCourse}
          />
        </div>

        {/* Detail Panel */}
        {activeCourse && (
          <CourseDetailPanel
            node={activeCourse}
            activeTab={activeTab}
            activeSkillName={activeSkillName}
            onTabChange={setActiveTab}
            onSelectSkill={openSkill}
            onCloseSkill={closeSkill}
            onClosePanel={closeCourse}
            onAdvanceStatus={() => transitionNode(activeCourse.courseCode)}
          />
        )}
      </div>
    </div>
  );
}
