import React, { useEffect, useState } from 'react';
import { useSkillTree } from './useSkillTree';
import SkillTreeCanvas from './SkillTreeCanvas';
import CourseDetailPanel from './CourseDetailPanel';
import RepersonalizeButton from './RepersonalizeButton';
import './skill-tree.css';

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
      <div className="skill-tree-loading-state">
        <div className="skill-tree-loading-state__inner">
          <div className="skill-tree-spinner"></div>
          <p>Loading Skill Tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skill-tree-loading-state">
        <div className="skill-tree-loading-state__inner">
          <p className="skill-tree-error-title">Error Loading Skill Tree</p>
          <p className="skill-tree-error-message">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skill-tree-page">
      <header className="skill-tree-page__header">
        <div className="skill-tree-page__header-inner">
          <div>
            <h1 className="skill-tree-page__title">Skill Tree</h1>
            {roadmapName && <p className="skill-tree-page__subtitle">{roadmapName}</p>}
          </div>
          {needsRepersonalization && (
            <RepersonalizeButton
              repersonalizing={repersonalizing}
              onRepersonalize={triggerRepersonalize}
            />
          )}
        </div>
      </header>

      <div className="skill-tree-layout">
        <div className="skill-tree-layout__canvas">
          <SkillTreeCanvas
            nodes={nodes || []}
            onSelectNode={openCourse}
          />
        </div>

        {activeCourse && (
          <CourseDetailPanel
            node={activeCourse}
            activeTab={activeTab}
            activeSkillName={activeSkillName}
            onTabChange={setActiveTab}
            onSelectSkill={openSkill}
            onCloseSkill={closeSkill}
            onClosePanel={closeCourse}
            onStatusChange={(status) => transitionNode(activeCourse.courseCode, status)}
          />
        )}
      </div>
    </div>
  );
}
