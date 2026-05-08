import React from 'react';

/**
 * T044: Resources tab - grouped materials rendering
 */

export default function ResourcesTab({ resources = [] }) {
  const normalized = Array.isArray(resources) ? resources : [];

  return (
    <div className="resources-tab">
      <section className="resources-tab__section">
        <h4 className="resources-tab__heading">Resources</h4>
        {normalized.length === 0 ? (
          <p className="skill-tree-muted-text">No resources available</p>
        ) : (
          <ul className="resources-tab__list">
            {normalized.map((item, idx) => (
              <li key={idx} className="resources-tab__item">
                <pre className="skill-tree-json-preview">{JSON.stringify(item, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
