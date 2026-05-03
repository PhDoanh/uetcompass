import React, { useMemo, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { getNextTransitionOptions } from './skillTree.types';
import ReviewTab from './ReviewTab';

function toLabel(state) {
  if (state === 'inProgress') return 'In Progress';
  if (state === 'completed') return 'Completed';
  if (state === 'skip') return 'Skip';
  return 'Pending';
}

function toNodeTypeLabel(type) {
  return type === 'sub_topic' ? 'Subtopic' : 'Topic';
}

function normalizeResources(resources = []) {
  return resources
    .map((resource, index) => {
      if (typeof resource === 'string') {
        const trimmed = resource.trim();
        if (!trimmed) return null;
        return {
          title: `Resource ${index + 1}`,
          url: trimmed,
        };
      }

      if (!resource || typeof resource !== 'object') {
        return null;
      }

      const title = String(resource.title || resource.name || `Resource ${index + 1}`).trim();
      const url = String(resource.url || resource.link || '').trim();
      if (!url) {
        return null;
      }

      return {
        title,
        url,
      };
    })
    .filter(Boolean);
}

export default function PublicRoadmapNodePanel({
  node,
  roadmapId = '',
  onClosePanel = () => {},
  onTransition = () => {},
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const nextOptions = useMemo(
    () => getNextTransitionOptions(node?.status || 'pending'),
    [node?.status]
  );

  const normalizedResources = useMemo(
    () => normalizeResources(node?.resources || []),
    [node?.resources]
  );

  const handleTransition = async (toState) => {
    if (!toState || toState === node?.status) return;

    try {
      setIsUpdating(true);
      await onTransition(node?.status || 'pending', toState);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <aside className="skill-tree-panel public-roadmap-panel" aria-label="Sample roadmap node detail panel">
      <div className="skill-tree-panel__header">
        <div className="skill-tree-panel__title-row">
          <div className="skill-tree-panel__title-wrap">
            <h2 className="skill-tree-panel__title">{node?.label || node?.nodeId}</h2>
            <p className="skill-tree-panel__subtitle">{toNodeTypeLabel(node?.type)}</p>
          </div>
          <button
            onClick={onClosePanel}
            className="skill-tree-icon-button"
            aria-label="Close node detail panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="skill-tree-panel__status-row">
          <span className={`skill-tree-status-chip skill-tree-status-chip--${node?.status || 'pending'}`}>
            {toLabel(node?.status || 'pending')}
          </span>
        </div>

        <div className="skill-tree-panel__transition-block">
          <label className="skill-tree-select-label" htmlFor="sample-status-select">
            Move state
          </label>
          <select
            id="sample-status-select"
            value=""
            onChange={(e) => handleTransition(e.target.value)}
            disabled={isUpdating}
            className="skill-tree-status-select"
          >
            <option value="" disabled>
              Select next state
            </option>
            {nextOptions.map((option) => (
              <option key={option} value={option}>
                {toLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="skill-tree-panel__content">
        <section className="resources-tab__section">
          <h4 className="resources-tab__heading">Description</h4>
          {String(node?.description || '').trim() ? (
            <p className="why-tab__content">{node.description}</p>
          ) : (
            <p className="skill-tree-muted-text">No description available</p>
          )}
        </section>

        <section className="resources-tab__section">
          <h4 className="resources-tab__heading">Resources</h4>
          {normalizedResources.length === 0 ? (
            <p className="skill-tree-muted-text">No resources available</p>
          ) : (
            <ul className="sample-resource-list">
              {normalizedResources.map((resource) => (
                <li key={`${resource.title}-${resource.url}`} className="sample-resource-list__item">
                  <div>
                    <p className="sample-resource-list__title">{resource.title}</p>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="sample-resource-list__link"
                    >
                      {resource.url}
                    </a>
                  </div>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="sample-resource-list__open"
                    aria-label={`Open ${resource.title}`}
                  >
                    <ExternalLink size={16} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ReviewTab roadmapId={roadmapId} />
      </div>
    </aside>
  );
}
