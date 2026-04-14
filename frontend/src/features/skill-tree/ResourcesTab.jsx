import React, { useEffect, useState } from 'react';
import * as skillTreeApi from '../../services/skillTree.api';

/**
 * T044: Resources tab - grouped materials rendering
 */

export default function ResourcesTab({ courseCode }) {
  const [resources, setResources] = useState({ textbook: [], slide: [], lab: [], assignment: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || '';
        const data = await skillTreeApi.getResources(token, courseCode);
        setResources(data.resources || { textbook: [], slide: [], lab: [], assignment: [] });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [courseCode]);

  if (loading) {
    return <div className="skill-tree-muted-text">Loading resources...</div>;
  }

  if (error) {
    return <div className="skill-tree-error-text">Error: {error}</div>;
  }

  const types = [
    { key: 'textbook', label: '📚 Textbooks', items: resources.textbook || [] },
    { key: 'slide', label: '📊 Slides', items: resources.slide || [] },
    { key: 'lab', label: '🔬 Labs', items: resources.lab || [] },
    { key: 'assignment', label: '✍️ Assignments', items: resources.assignment || [] },
  ];

  return (
    <div className="resources-tab">
      {types.map((type) => (
        <section key={type.key} className="resources-tab__section">
          <h4 className="resources-tab__heading">{type.label}</h4>
          {type.items.length === 0 ? (
            <p className="skill-tree-muted-text">No items</p>
          ) : (
            <ul className="resources-tab__list">
              {type.items.map((item, idx) => (
                <li key={idx} className="resources-tab__item">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="skill-tree-link">
                      {item.title}
                    </a>
                  ) : (
                    <span className="resources-tab__title">{item.title}</span>
                  )}
                  {item.description && <p className="resources-tab__description">{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
