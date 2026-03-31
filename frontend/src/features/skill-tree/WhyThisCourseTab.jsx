import React, { useEffect, useState } from 'react';
import * as skillTreeApi from '../../services/skillTree.api';

/**
 * T045: Why This Course tab - AI explanation with caching
 */

export default function WhyThisCourseTab({ courseCode }) {
  const [content, setContent] = useState('');
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || '';
        const data = await skillTreeApi.getWhyCourse(token, courseCode);
        setContent(data.content || '');
        setCached(data.cached || false);
      } catch (err) {
        setError('Content temporarily unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [courseCode]);

  if (loading) {
    return <div className="skill-tree-muted-text">Generating explanation...</div>;
  }

  if (error) {
    return <div className="skill-tree-muted-text skill-tree-muted-text--italic">{error}</div>;
  }

  return (
    <div className="why-tab">
      {cached && <p className="why-tab__cached">Pinned from cache</p>}
      <p className="why-tab__content">{content}</p>
    </div>
  );
}
