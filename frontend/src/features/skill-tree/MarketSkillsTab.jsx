import React, { useEffect, useState } from 'react';
import * as skillTreeApi from '../../services/skillTree.api';
import SkillResourcesModal from './SkillResourcesModal';

/**
 * T046: Market Skills tab - skill list with job count ordering and drill-down
 */

export default function MarketSkillsTab({
  courseCode,
  activeSkillName = null,
  onSelectSkill = () => {},
  onCloseSkill = () => {},
}) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || '';
        const data = await skillTreeApi.getMarketSkills(token, courseCode);
        setSkills(data.skills || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [courseCode]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading skills...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-sm">Error: {error}</div>;
  }

  if (skills.length === 0) {
    return <div className="text-gray-500 text-sm">No market skills found</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {skills.map((skill) => (
          <button
            key={skill.name}
            onClick={() => onSelectSkill(skill.name)}
            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className=" font-medium text-gray-900">{skill.name}</div>
              <div className="text-xs text-gray-500">{skill.jobCount || 0} jobs</div>
            </div>
          </button>
        ))}
      </div>

      {activeSkillName && (
        <SkillResourcesModal skillName={activeSkillName} onClose={onCloseSkill} />
      )}
    </>
  );
}
