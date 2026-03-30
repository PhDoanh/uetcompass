/**
 * T046: Skill Resources Component (User Story 3)
 * Resource list section for a skill
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ResourceCard from './ResourceCard';
import { getSkillResources } from '../../services/resources.api';

function SkillResources({ skillName }) {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getSkillResources(skillName);
        setResources(result.resources || []);
      } catch (err) {
        setError(err.message || 'Failed to load resources');
      }

      setIsLoading(false);
    };

    if (skillName) {
      fetchResources();
    }
  }, [skillName]);

  if (isLoading) {
    return (
      <div style={styles.section}>
        <h3>Learning Resources for {skillName}</h3>
        <p>Loading resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.section}>
        <h3>Learning Resources for {skillName}</h3>
        <p style={styles.error}>Failed to load resources: {error}</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div style={styles.section}>
        <h3>Learning Resources for {skillName}</h3>
        <p style={styles.emptyState}>No resources collected yet for this skill</p>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h3>Learning Resources for {skillName}</h3>
      <div style={styles.grid}>
        {resources.map(res => (
          <ResourceCard
            key={res.resourceId}
            title={res.title}
            url={res.url}
            sourcePlatform={res.sourcePlatform}
            resourceType={res.resourceType}
            isFree={res.isFree}
            qualitySignal={res.qualitySignal}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  section: {
    marginTop: '24px',
    padding: '16px',
    border: '1px solid #eee',
    borderRadius: '8px',
    backgroundColor: '#fafafa'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
    marginTop: '12px'
  },
  emptyState: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: '12px'
  },
  error: {
    color: '#d32f2f',
    marginTop: '12px'
  }
};

SkillResources.propTypes = {
  skillName: PropTypes.string.isRequired
};

export default SkillResources;
