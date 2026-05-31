import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getNextTransitionOptions } from './skillTree.types';
import ReviewTab from './ReviewTab';
import NodeResourcesList from './NodeResourcesList';

function toLabel(state) {
  if (state === 'inProgress') return 'In Progress';
  if (state === 'completed') return 'Completed';
  if (state === 'skip') return 'Skip';
  return 'Pending';
}

export default function CourseDetailPanel({
  node,
  roadmapId = '',
  onClosePanel = () => {},
  onTransition = () => {},
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const nextOptions = useMemo(
    () => getNextTransitionOptions(node.progressState),
    [node.progressState]
  );

  const handleTransition = async (toState) => {
    if (!toState || toState === node.progressState) return;
    try {
      setIsUpdating(true);
      await onTransition(node.progressState, toState);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <aside className="skill-tree-panel" aria-label="Skill detail panel">
      <div className="skill-tree-panel__header">
        <div className="skill-tree-panel__title-row">
          <div className="skill-tree-panel__title-wrap">
            <h2 className="skill-tree-panel__title">{node.skillName}</h2>
            <p className="skill-tree-panel__subtitle">{node.nodeType === 'topic' ? 'Topic' : 'Subtopic'}</p>
          </div>
          <button
            onClick={onClosePanel}
            className="skill-tree-icon-button"
            aria-label="Close node detail panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="skill-tree-panel__status-row">
          <span className={`skill-tree-status-chip skill-tree-status-chip--${node.progressState}`}>
            {toLabel(node.progressState)}
          </span>
        </div>

        <div className="skill-tree-panel__transition-block">
          <label className="skill-tree-select-label" htmlFor="status-select">
            Move state
          </label>
          <select
            id="status-select"
            value=""
            onChange={(e) => handleTransition(e.target.value)}
            disabled={isUpdating}
            className="skill-tree-status-select"
          >
            <option value="" disabled>
              Select next state
            </option>
            {nextOptions.map((option) => (
              <option key={option} value={option}>
                {toLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="skill-tree-panel__content">
        <section className="resources-tab__section">
          <h4 className="resources-tab__heading">Why this skill?</h4>
          {node.reason ? <p className="why-tab__content">{node.reason}</p> : <p className="skill-tree-muted-text">No reason available</p>}
        </section>

        <NodeResourcesList resources={node.resources || []} relatedJobs={node.relatedJobs || []} />

        <section className="resources-tab__section">
          <h4 className="resources-tab__heading">Related Courses</h4>
          {(node.relatedCourses || []).length === 0 ? (
            <p className="skill-tree-muted-text">No related courses available</p>
          ) : (
            <ul className="resources-tab__list">
              {(node.relatedCourses || []).map((course) => (
                <li key={`${node.nodeId}-${course.courseCode}`} className="resources-tab__item">
                  <div className="resources-tab__title">{course.courseCode} - {course.courseName}</div>
                  <p className="resources-tab__description">Credits: {course.credits}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ReviewTab roadmapId={roadmapId} />
      </div>
    </aside>
  );
}
