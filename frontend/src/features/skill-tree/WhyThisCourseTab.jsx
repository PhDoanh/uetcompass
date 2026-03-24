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
    return <div className="text-gray-500 text-sm">Generating explanation...</div>;
  }

  if (error) {
    return <div className="text-gray-600 text-sm italic">{error}</div>;
  }

  return (
    <div>
      {cached && <p className="text-xs text-gray-500 mb-2">📌 Cached</p>}
      <p className="text-gray-800 text-sm leading-relaxed">{content}</p>
    </div>
  );
}
