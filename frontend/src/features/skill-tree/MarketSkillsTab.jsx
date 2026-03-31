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
    return <div className="skill-tree-muted-text">Loading skills...</div>;
  }

  if (error) {
    return <div className="skill-tree-error-text">Error: {error}</div>;
  }

  if (skills.length === 0) {
    return <div className="skill-tree-muted-text">No market skills found</div>;
  }

  return (
    <>
      <div className="skills-tab">
        {skills.map((skill) => (
          <button
            key={skill.name}
            onClick={() => onSelectSkill(skill.name)}
            className="skills-tab__item"
          >
            <div className="skills-tab__item-top">
              <div className="skills-tab__name">{skill.name}</div>
              <div className="skills-tab__count">{skill.jobCount || 0} jobs</div>
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
