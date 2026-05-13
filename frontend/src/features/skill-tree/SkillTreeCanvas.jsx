import React from 'react';
import CourseNode from './CourseNode';

function chunk(items, size) {
  const output = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

const TOPIC_NODE_WIDTH = 260;
const TOPIC_LINK_WIDTH = 104;
const CONNECTOR_SUBTOPIC_STEP = 56;
const CONNECTOR_BASE_DROP = 28;
const CONNECTOR_EXTRA_TO_NEXT_ROW = 84;

function getRowWidth(topicCount) {
  if (!topicCount) return 0;
  return topicCount * TOPIC_NODE_WIDTH + (topicCount - 1) * TOPIC_LINK_WIDTH;
}

export default function SkillTreeCanvas({ nodes = [], edges = [], onSelectNode = () => {}, focusNodeId = '' }) {
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
        {topicRows.map((row, rowIndex) => {
          const isReverseRow = rowIndex % 2 === 1;
          const displayRow = isReverseRow ? [...row].reverse() : row;
          const hasNextRow = rowIndex < topicRows.length - 1;
          const nextRow = hasNextRow ? topicRows[rowIndex + 1] : [];
          const nextDisplayRow = (rowIndex + 1) % 2 === 1 ? [...nextRow].reverse() : nextRow;

          const maxSubtopicsInRow = Math.max(
            0,
            ...displayRow.map((topic) => (branchByParent.get(topic.nodeId) || []).length)
          );
          const connectorDrop =
            CONNECTOR_BASE_DROP +
            maxSubtopicsInRow * CONNECTOR_SUBTOPIC_STEP +
            CONNECTOR_EXTRA_TO_NEXT_ROW;

          const currentHalf = getRowWidth(displayRow.length) / 2;
          const nextHalf = getRowWidth(nextDisplayRow.length) / 2;

          return (
          <section
            className={`skill-tree-roadmap-v2__row-block ${hasNextRow ? 'skill-tree-roadmap-v2__row-block--with-connector' : ''}`}
            key={`topic-row-${rowIndex}`}
            style={hasNextRow ? {
              '--connector-drop': `${connectorDrop}px`,
              '--current-half': `${currentHalf}px`,
              '--next-half': `${nextHalf}px`,
            } : undefined}
          >
            <div className="skill-tree-roadmap-v2__row" role="list">
              {displayRow.map((topic, topicIndex) => {
                const branches = branchByParent.get(topic.nodeId) || [];
                return (
                  <React.Fragment key={topic.nodeId}>
                    <div className="skill-tree-roadmap-v2__cell" role="listitem">
                      <CourseNode
                        node={topic}
                        onSelect={() => onSelectNode(topic.nodeId)}
                        isFocused={Boolean(focusNodeId && focusNodeId === topic.nodeId)}
                      />

                      {branches.length > 0 && (
                        <div className="skill-tree-roadmap-v2__chips" aria-label="Subtopics">
                          {branches.map((subtopic) => (
                            <div key={subtopic.nodeId} className="skill-tree-roadmap-v2__chip-wrap">
                              <div className="skill-tree-roadmap-v2__chip-line" aria-hidden="true" />
                              <CourseNode
                                node={subtopic}
                                onSelect={() => onSelectNode(subtopic.nodeId)}
                                isFocused={Boolean(focusNodeId && focusNodeId === subtopic.nodeId)}
                              />
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

            {hasNextRow && (
              <div
                className={`skill-tree-roadmap-v2__row-connector ${isReverseRow ? 'skill-tree-roadmap-v2__row-connector--left' : 'skill-tree-roadmap-v2__row-connector--right'}`}
                aria-hidden="true"
              >
                <div className="skill-tree-roadmap-v2__row-connector-out" />
                <div className="skill-tree-roadmap-v2__row-connector-down" />
                <div className="skill-tree-roadmap-v2__row-connector-in" />
                <div className="skill-tree-roadmap-v2__row-connector-arrow" />
              </div>
            )}
          </section>
          );
        })}
      </div>
    </div>
  );
}
