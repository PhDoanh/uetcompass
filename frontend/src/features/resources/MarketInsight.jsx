/**
 * T034: Market Insight Component (User Story 2)
 * Full market trends page with ranked skill list
 */

import React, { useEffect, useState } from 'react';
import SkillTrendItem from './SkillTrendItem';
import { getMarketTrends } from '../../services/resources.api';

function MarketInsight() {
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getMarketTrends();
        setTrends(result.trends || []);
        setLastRefreshedAt(result.lastRefreshedAt);
      } catch (err) {
        setError(err.message || 'Failed to load market trends');
      }

      setIsLoading(false);
    };

    fetchTrends();
  }, []);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h1>Market Insights</h1>
        <p>Loading market trends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>Market Insights</h1>
        <p style={styles.error}>Failed to load trends: {error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Market Insights for Tech Skills</h1>
      
      {lastRefreshedAt && (
        <p style={styles.lastUpdated}>
          Last updated: {new Date(lastRefreshedAt).toLocaleString()}
        </p>
      )}

      {trends.length === 0 ? (
        <p style={styles.emptyState}>No trends collected yet</p>
      ) : (
        <div style={styles.table}>
          <div style={styles.headerRow}>
            <div style={styles.headerCell}>Skill</div>
            <div style={styles.headerCell}>Job Count</div>
            <div style={styles.headerCell}>Salary Range</div>
            <div style={styles.headerCell}>Trend</div>
          </div>

          {trends.map(trend => (
            <SkillTrendItem
              key={trend.skillId || trend.skillName}
              skillId={trend.skillId}
              skillName={trend.skillName}
              jobCount={trend.jobCount}
              averageSalaryRange={trend.averageSalaryRange}
              jobCountTrend={trend.jobCountTrend}
              personalizationContext={trend.personalizationContext}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px'
  },
  lastUpdated: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '16px'
  },
  table: {
    border: '1px solid #ddd',
    borderRadius: '6px',
    overflow: 'hidden',
    marginTop: '16px'
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: '16px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    fontSize: '13px',
    borderBottom: '2px solid #ddd'
  },
  headerCell: {
    color: '#333'
  },
  emptyState: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: '24px'
  },
  error: {
    color: '#d32f2f',
    marginTop: '12px'
  }
};

export default MarketInsight;
