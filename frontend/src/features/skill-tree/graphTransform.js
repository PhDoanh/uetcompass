import { PROGRESS_STATES } from './skillTree.types';

function toStateMap(progressState = {}) {
  const map = new Map();
  for (const stateKey of Object.keys(progressState)) {
    for (const nodeId of progressState[stateKey] || []) {
      map.set(nodeId, stateKey);
    }
  }
  return map;
}

export function buildSkillTreeGraph(roadmapNodes = [], progressState = {}) {
  const stateMap = toStateMap(progressState);

  const topicNodes = roadmapNodes.filter((n) => n.nodeType === 'topic');
  const subtopicNodes = roadmapNodes.filter((n) => n.nodeType === 'subtopic');

  const viewNodes = roadmapNodes.map((node, index) => ({
    ...node,
    id: node.nodeId,
    label: node.skillName,
    index,
    progressState: stateMap.get(node.nodeId) || PROGRESS_STATES.PENDING,
  }));

  const edges = [];

  for (let i = 0; i < topicNodes.length - 1; i += 1) {
    edges.push({
      id: `main:${topicNodes[i].nodeId}->${topicNodes[i + 1].nodeId}`,
      sourceId: topicNodes[i].nodeId,
      targetId: topicNodes[i + 1].nodeId,
      type: 'main_flow',
    });
  }

  for (const subtopic of subtopicNodes) {
    if (!subtopic.parentNodeId) continue;
    edges.push({
      id: `branch:${subtopic.parentNodeId}->${subtopic.nodeId}`,
      sourceId: subtopic.parentNodeId,
      targetId: subtopic.nodeId,
      type: 'branch',
    });
  }

  return {
    nodes: viewNodes,
    edges,
  };
}
