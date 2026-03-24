import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
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
  onAdvanceStatus = () => {},
}) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const tabs = [
    { id: 'resources', label: 'Resources', icon: '📚' },
    { id: 'why', label: 'Why This Course', icon: '💡' },
    { id: 'skills', label: 'Market Skills', icon: '📊' },
  ];

  const canAdvance = node.isUnlocked && node.status !== 'done';

  const handleAdvanceStatus = async () => {
    try {
      setIsAdvancing(true);
      await onAdvanceStatus();
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{node.courseCode}</h2>
            <p className="text-sm text-gray-700 mt-1">{node.nameVi}</p>
            {node.nameEn && <p className="text-xs text-gray-500">{node.nameEn}</p>}
          </div>
          <button
            onClick={onClosePanel}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{
            backgroundColor: node.status === 'done' ? '#dcfce7' : node.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
            color: node.status === 'done' ? '#166534' : node.status === 'in_progress' ? '#0c4a6e' : '#6b7280',
          }}>
            {node.status.replace('_', ' ')}
          </div>
          {node.credits && <span className="text-xs text-gray-600">{node.credits} credits</span>}
        </div>

        {/* Advance Status Button (T034: Dedicated control) */}
        <button
          onClick={handleAdvanceStatus}
          disabled={!canAdvance || isAdvancing}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            canAdvance
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {node.isUnlocked ? (
            <>
              Advance Status
              {!isAdvancing && <ChevronRight className="w-4 h-4" />}
            </>
          ) : (
            'Locked'
          )}
          {isAdvancing && <span className="text-xs">...</span>}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
}
