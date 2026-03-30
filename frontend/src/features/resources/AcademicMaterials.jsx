/**
 * T020: Academic Materials Section Component (User Story 1)
 * Displays a grid of academic materials for a course
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import AcademicDocumentCard from './AcademicDocumentCard';
import { getAcademicMaterials } from '../../services/resources.api';

function AcademicMaterials({ courseName, authToken }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAcademicMaterials(courseName, authToken);
        setDocuments(result.documents || []);
      } catch (err) {
        setError(err.message || 'Failed to load academic materials');
      }

      setIsLoading(false);
    };

    if (courseName) {
      fetchMaterials();
    }
  }, [courseName, authToken]);

  if (isLoading) {
    return (
      <div style={styles.section}>
        <h3>Academic Materials</h3>
        <p>Loading academic materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.section}>
        <h3>Academic Materials</h3>
        <p style={styles.error}>Failed to load materials: {error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div style={styles.section}>
        <h3>Academic Materials</h3>
        <p style={styles.emptyState}>No materials available for this course</p>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h3>Academic Materials for {courseName}</h3>
      <div style={styles.grid}>
        {documents.map(doc => (
          <AcademicDocumentCard
            key={doc.documentId}
            title={doc.title}
            url={doc.url}
            sourceType={doc.sourceType}
            documentType={doc.documentType}
            courseName={doc.courseName}
            skillName={doc.skillName}
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

AcademicMaterials.propTypes = {
  courseName: PropTypes.string.isRequired,
  authToken: PropTypes.string
};

AcademicMaterials.defaultProps = {
  authToken: ''
};

export default AcademicMaterials;
