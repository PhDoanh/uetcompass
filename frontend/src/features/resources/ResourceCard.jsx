/**
 * T045: Resource Card Component (User Story 3)
 * Single learning resource display
 */

import React from 'react';
import PropTypes from 'prop-types';

const platformColors = {
  udemy: '#a435f0',
  coursera: '#0056d2',
  youtube: '#ff0000',
  edx: '#02262b',
  freecodecamp: '#d0701d',
  viblo: '#ff6b6b',
  linkedin_learning: '#0077b5',
  other: '#666'
};

function ResourceCard({
  title,
  url,
  sourcePlatform,
  resourceType,
  isFree,
  qualitySignal
}) {
  const platformColor = platformColors[sourcePlatform] || platformColors.other;

  const qualityText = qualitySignal ? (() => {
    if (qualitySignal.type === 'rating') {
      return `${qualitySignal.value}⭐`;
    }
    if (qualitySignal.type === 'view_count') {
      return `${(qualitySignal.value / 1000000).toFixed(1)}M views`;
    }
    if (qualitySignal.type === 'enrollment_count') {
      return `${(qualitySignal.value / 1000).toFixed(0)}k students`;
    }
    return null;
  })() : null;

  return (
    <div style={styles.card}>
      {/* Platform Badge */}
      <div style={{
        ...styles.platformBadge,
        backgroundColor: platformColor
      }}>
        {sourcePlatform.replace(/_/g, ' ').toUpperCase()}
      </div>

      {/* Title Link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.title}
      >
        {title}
      </a>

      {/* Resource Type Badge */}
      <div style={styles.typeBadge}>
        {resourceType.toUpperCase()}
      </div>

      {/* Free/Paid Badge */}
      <div style={{
        ...styles.freeBadge,
        backgroundColor: isFree ? '#4caf50' : '#999'
      }}>
        {isFree ? 'FREE' : 'PAID'}
      </div>

      {/* Quality Signal */}
      {qualityText && (
        <div style={styles.quality}>
          {qualityText}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    marginBottom: '12px',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.2s'
  },
  platformBadge: {
    display: 'inline-block',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '3px 6px',
    borderRadius: '3px',
    marginBottom: '8px',
    marginRight: '6px'
  },
  title: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1976d2',
    textDecoration: 'none',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  typeBadge: {
    display: 'inline-block',
    fontSize: '10px',
    border: '1px solid #ddd',
    padding: '2px 6px',
    borderRadius: '3px',
    marginRight: '6px',
    marginBottom: '8px'
  },
  freeBadge: {
    display: 'inline-block',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '3px 6px',
    borderRadius: '3px',
    marginBottom: '8px'
  },
  quality: {
    fontSize: '11px',
    color: '#666',
    marginTop: '6px'
  }
};

ResourceCard.propTypes = {
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  sourcePlatform: PropTypes.string.isRequired,
  resourceType: PropTypes.string.isRequired,
  isFree: PropTypes.bool.isRequired,
  qualitySignal: PropTypes.object
};

export default ResourceCard;
