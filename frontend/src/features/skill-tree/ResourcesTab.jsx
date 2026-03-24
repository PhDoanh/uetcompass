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
    return <div className="text-gray-500 text-sm">Loading resources...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-sm">Error: {error}</div>;
  }

  const types = [
    { key: 'textbook', label: '📚 Textbooks', items: resources.textbook || [] },
    { key: 'slide', label: '📊 Slides', items: resources.slide || [] },
    { key: 'lab', label: '🔬 Labs', items: resources.lab || [] },
    { key: 'assignment', label: '✍️ Assignments', items: resources.assignment || [] },
  ];

  return (
    <div className="space-y-4">
      {types.map((type) => (
        <div key={type.key}>
          <h4 className="font-semibold text-gray-900 mb-2">{type.label}</h4>
          {type.items.length === 0 ? (
            <p className="text-gray-500 text-sm">No items</p>
          ) : (
            <ul className="space-y-2">
              {type.items.map((item, idx) => (
                <li key={idx} className="text-sm">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    <span className="text-gray-700">{item.title}</span>
                  )}
                  {item.description && <p className="text-gray-500 text-xs mt-1">{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
