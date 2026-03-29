/**
 * T019: Academic Document Card Component (User Story 1)
 * Displays a single academic material document
 */

import React from 'react';
import PropTypes from 'prop-types';

const sourceTypeBadgeColors = {
  uet_official: { bg: '#e3f2fd', text: '#1976d2', label: 'UET Official' },
  github: { bg: '#f5f5f5', text: '#333', label: 'GitHub' },
  external: { bg: '#fff3e0', text: '#e65100', label: 'External' }
};

const documentTypeBadgeColors = {
  slide: '#e91e63',
  lecture_note: '#2196f3',
  syllabus: '#4caf50',
  exercise: '#ff9800',
  code_sample: '#673ab7'
};

function AcademicDocumentCard({
  title,
  url,
  sourceType,
  documentType,
  courseName,
  skillName
}) {
  const sourceStyle = sourceTypeBadgeColors[sourceType] || sourceTypeBadgeColors.external;
  const docColor = documentTypeBadgeColors[documentType] || '#999';

  return (
    <div className="academic-doc-card" style={styles.card}>
      {/* Source Type Badge */}
      <div style={{
        ...styles.badge,
        backgroundColor: sourceStyle.bg,
        color: sourceStyle.text
      }}>
        {sourceStyle.label}
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

      {/* Document Type Badge */}
      <div style={{
        ...styles.docBadge,
        borderColor: docColor,
        color: docColor
      }}>
        {documentType.replace(/_/g, ' ').toUpperCase()}
      </div>

      {/* Course Name */}
      <p style={styles.courseName}>{courseName}</p>

      {/* Skill Label (if present) */}
      {skillName && (
        <div style={styles.skillLabel}>
          Skill: {skillName}
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
    transition: 'box-shadow 0.2s',
    cursor: 'pointer'
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '3px',
    marginBottom: '8px'
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
  docBadge: {
    display: 'inline-block',
    fontSize: '11px',
    border: '1px solid',
    padding: '3px 6px',
    borderRadius: '3px',
    marginRight: '6px',
    marginBottom: '8px'
  },
  courseName: {
    margin: '0',
    fontSize: '12px',
    color: '#666',
    marginBottom: '6px'
  },
  skillLabel: {
    fontSize: '11px',
    color: '#1976d2',
    backgroundColor: '#e3f2fd',
    padding: '4px 6px',
    borderRadius: '3px',
    display: 'inline-block'
  }
};

AcademicDocumentCard.propTypes = {
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  sourceType: PropTypes.oneOf(['uet_official', 'github', 'external']).isRequired,
  documentType: PropTypes.oneOf(['slide', 'lecture_note', 'syllabus', 'exercise', 'code_sample']).isRequired,
  courseName: PropTypes.string.isRequired,
  skillName: PropTypes.string
};

export default AcademicDocumentCard;
