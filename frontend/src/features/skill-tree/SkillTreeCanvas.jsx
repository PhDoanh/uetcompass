import React from 'react';
import CourseNode from './CourseNode';

function chunk(items, size) {
  const output = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

export default function SkillTreeCanvas({ nodes = [], edges = [], onSelectNode = () => {} }) {
  if (!nodes.length) {
    return (
      <div className="skill-tree-empty-state">
        <p>No roadmap nodes available</p>
      </div>
    );
  }

  const branchByParent = new Map();
  for (const node of nodes) {
    if (node.nodeType !== 'subtopic' || !node.parentNodeId) continue;
    if (!branchByParent.has(node.parentNodeId)) {
      branchByParent.set(node.parentNodeId, []);
    }
    branchByParent.get(node.parentNodeId).push(node);
  }

  const topics = nodes.filter((n) => n.nodeType === 'topic');
  const topicRows = chunk(topics, 3);

  return (
    <div className="skill-tree-canvas skill-canvas">
      <div className="skill-tree-roadmap-v2" role="list" aria-label="Roadmap topics">
        {topicRows.map((row, rowIndex) => (
          <section className="skill-tree-roadmap-v2__row-block" key={`topic-row-${rowIndex}`}>
            <div className="skill-tree-roadmap-v2__row" role="list">
              {(rowIndex % 2 === 1 ? [...row].reverse() : row).map((topic, topicIndex, displayRow) => {
                const branches = branchByParent.get(topic.nodeId) || [];
                const isReverseRow = rowIndex % 2 === 1;
                return (
                  <React.Fragment key={topic.nodeId}>
                    <div className="skill-tree-roadmap-v2__cell" role="listitem">
                      <CourseNode node={topic} onSelect={() => onSelectNode(topic.nodeId)} />

                      {branches.length > 0 && (
                        <div className="skill-tree-roadmap-v2__chips" aria-label="Subtopics">
                          {branches.map((subtopic) => (
                            <div key={subtopic.nodeId} className="skill-tree-roadmap-v2__chip-wrap">
                              <div className="skill-tree-roadmap-v2__chip-line" aria-hidden="true" />
                              <CourseNode node={subtopic} onSelect={() => onSelectNode(subtopic.nodeId)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {topicIndex < displayRow.length - 1 && (
                      <div
                        className={`skill-tree-roadmap-v2__topic-link ${isReverseRow ? 'skill-tree-roadmap-v2__topic-link--left' : 'skill-tree-roadmap-v2__topic-link--right'}`}
                        aria-hidden="true"
                      >
                        <div className="skill-tree-roadmap-v2__topic-link-line" />
                        <div className="skill-tree-roadmap-v2__topic-link-arrow" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
