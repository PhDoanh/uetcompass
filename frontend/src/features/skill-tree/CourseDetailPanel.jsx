import React, { useState } from 'react';
import { X } from 'lucide-react';
import ResourcesTab from './ResourcesTab';
import WhyThisCourseTab from './WhyThisCourseTab';
import MarketSkillsTab from './MarketSkillsTab';

/**
 * T034: Dedicated status action control in detail panel
 * Separates node selection (click for panel) from state transition (dedicated button)
 */

export default function CourseDetailPanel({
  node,
  activeTab = 'resources',
  activeSkillName = null,
  onTabChange = () => {},
  onSelectSkill = () => {},
  onCloseSkill = () => {},
  onClosePanel = () => {},
  onStatusChange = () => {},
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const tabs = [
    { id: 'resources', label: 'Resources', icon: '📚' },
    { id: 'why', label: 'Why This Course', icon: '💡' },
    { id: 'skills', label: 'Market Skills', icon: '📊' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'pending' },
    { value: 'in_progress', label: 'in progress' },
    { value: 'done', label: 'done' },
  ];

  const handleStatusChange = async (event) => {
    const nextStatus = event.target.value;
    if (nextStatus === node.status || !node.isUnlocked) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await onStatusChange(nextStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const normalizedStatus = node.status === 'in_progress' ? 'in progress' : node.status;

  return (
    <aside className="skill-tree-panel">
      <div className="skill-tree-panel__header">
        <div className="skill-tree-panel__title-row">
          <div className="skill-tree-panel__title-wrap">
            <h2 className="skill-tree-panel__title">{node.courseCode}</h2>
            <p className="skill-tree-panel__subtitle">{node.nameVi}</p>
            {node.nameEn && <p className="skill-tree-panel__subtle">{node.nameEn}</p>}
          </div>
          <button
            onClick={onClosePanel}
            className="skill-tree-icon-button"
            aria-label="Close course detail panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="skill-tree-panel__status-row">
          <span className={`skill-tree-status-chip skill-tree-status-chip--${node.status}`}>
            {normalizedStatus}
          </span>
          {node.credits && <span className="skill-tree-panel__credits">{node.credits} credits</span>}
        </div>

        <label className="skill-tree-select-label" htmlFor="status-select">
          Status
        </label>
        <select
          id="status-select"
          value={node.status}
          onChange={handleStatusChange}
          disabled={!node.isUnlocked || isUpdatingStatus}
          className="skill-tree-status-select"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {!node.isUnlocked && (
          <p className="skill-tree-panel__hint">This course is locked until prerequisites are done.</p>
        )}
      </div>

      <div className="skill-tree-tabs" role="tablist" aria-label="Course details tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`skill-tree-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="skill-tree-panel__content">
        {activeTab === 'resources' && (
          <ResourcesTab courseCode={node.courseCode} />
        )}
        {activeTab === 'why' && (
          <WhyThisCourseTab courseCode={node.courseCode} />
        )}
        {activeTab === 'skills' && (
          <MarketSkillsTab
            courseCode={node.courseCode}
            activeSkillName={activeSkillName}
            onSelectSkill={onSelectSkill}
            onCloseSkill={onCloseSkill}
          />
        )}
      </div>
    </aside>
  );
}
