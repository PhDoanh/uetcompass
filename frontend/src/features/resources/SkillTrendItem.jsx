/**
 * T033: Skill Trend Item Component (User Story 2)
 * Single trend row in Market Insight page
 */

import React from 'react';
import PropTypes from 'prop-types';

function SkillTrendItem({
  skillId,
  skillName,
  jobCount,
  averageSalaryRange,
  jobCountTrend,
  personalizationContext
}) {
  const trendDisplay = {
    'increasing': { icon: '↑', color: '#4caf50', label: 'Increasing' },
    'stable': { icon: '—', color: '#999', label: 'Stable' },
    'decreasing': { icon: '↓', color: '#f44336', label: 'Decreasing' }
  };

  const trend = trendDisplay[jobCountTrend] || trendDisplay['stable'];

  const salaryText = averageSalaryRange
    ? `${averageSalaryRange.currency === 'VND' ? '₫' : '$'} ${averageSalaryRange.min.toLocaleString()}-${averageSalaryRange.max.toLocaleString()}`
    : 'Not specified';

  return (
    <div style={styles.row}>
      <div style={styles.skillName}>{skillName}</div>
      <div style={styles.jobCount}>{jobCount.toLocaleString()} jobs</div>
      <div style={styles.salary}>{salaryText}</div>
      <div style={{ ...styles.trend, color: trend.color }}>
        {trend.icon} {trend.label}
      </div>
    </div>
  );
}

const styles = {
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: '16px',
    padding: '12px',
    borderBottom: '1px solid #eee',
    alignItems: 'center'
  },
  skillName: {
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#1976d2',
    textDecoration: 'none'
  },
  jobCount: {
    fontSize: '13px'
  },
  salary: {
    fontSize: '13px',
    color: '#666'
  },
  trend: {
    fontSize: '13px',
    fontWeight: 'bold'
  }
};

SkillTrendItem.propTypes = {
  skillId: PropTypes.string,
  skillName: PropTypes.string.isRequired,
  jobCount: PropTypes.number.isRequired,
  averageSalaryRange: PropTypes.object,
  jobCountTrend: PropTypes.oneOf(['increasing', 'stable', 'decreasing']).isRequired,
  personalizationContext: PropTypes.object
};

export default SkillTrendItem;
