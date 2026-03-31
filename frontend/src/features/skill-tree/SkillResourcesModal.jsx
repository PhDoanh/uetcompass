import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import * as skillTreeApi from '../../services/skillTree.api';

/**
 * T053: Skill resources modal - free/paid learning resources
 */

export default function SkillResourcesModal({ skillName, onClose = () => {} }) {
  const [resources, setResources] = useState({ free: [], paid: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || '';
        const data = await skillTreeApi.getLearningResources(token, skillName);
        setResources(data.resources || { free: [], paid: [] });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [skillName]);

  return (
    <div className="skill-modal-overlay" role="dialog" aria-modal="true" aria-label={`Learn ${skillName}`}>
      <div className="skill-modal">
        <div className="skill-modal__header">
          <h3 className="skill-modal__title">Learn "{skillName}"</h3>
          <button onClick={onClose} className="skill-tree-icon-button" aria-label="Close skill resources">
            <X size={18} />
          </button>
        </div>

        {loading && <div className="skill-modal__state skill-tree-muted-text">Loading resources...</div>}

        {error && <div className="skill-modal__state skill-tree-error-text">Error: {error}</div>}

        {!loading && !error && (
          <div className="skill-modal__content">
            <div className="skill-modal__column">
              <h4 className="skill-modal__section-title">Free</h4>
              {resources.free && resources.free.length > 0 ? (
                <ul className="skill-modal__list">
                  {resources.free.map((r, idx) => (
                    <li key={idx} className="skill-modal__item">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="skill-tree-link">
                        {r.title}
                      </a>
                      <p className="skill-modal__platform">{r.platform}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="skill-tree-muted-text">No free resources</p>
              )}
            </div>

            <div className="skill-modal__column">
              <h4 className="skill-modal__section-title">Paid</h4>
              {resources.paid && resources.paid.length > 0 ? (
                <ul className="skill-modal__list">
                  {resources.paid.map((r, idx) => (
                    <li key={idx} className="skill-modal__item">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="skill-tree-link">
                        {r.title}
                      </a>
                      <p className="skill-modal__platform">{r.platform}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="skill-tree-muted-text">No paid resources</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
