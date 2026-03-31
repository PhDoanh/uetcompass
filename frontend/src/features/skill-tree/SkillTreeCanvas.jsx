import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import CourseNode from './CourseNode';

const BRANCH_SIDE_WIDTH = 280;
const BRANCH_GAP = 52;
const BRANCH_CENTER_WIDTH = 340;
const BRANCH_TOTAL_WIDTH = BRANCH_SIDE_WIDTH * 2 + BRANCH_GAP * 2 + BRANCH_CENTER_WIDTH;
const CHIP_HEIGHT = 44;
const CHIP_STEP = 56;

const CORE_KNOWLEDGE_MOCK = {
  IT1010: {
    right: ['Variables & Data Types', 'Control Flow', 'Functions', 'Arrays & Strings'],
  },
  IT3910E: {
    left: ['HTTP & REST', 'DOM Events', 'State Management'],
    right: ['Node.js Runtime', 'Express API Design', 'Client Rendering'],
  },
  IT4409: {
    left: ['Requirement Analysis', 'System Architecture', 'Design Patterns', 'Testing Strategy', 'CI/CD Basics'],
  },
};

function fallbackTopics(node) {
  const seed = (node.courseCode || 'CORE').replace(/[^A-Z0-9]/g, '');
  return [
    `${seed} Fundamentals`,
    `${seed} Practical Workflows`,
    `${seed} Problem Solving`,
    `${seed} Design Thinking`,
    `${seed} Quality & Testing`,
  ];
}

function resolveKnowledgeBranches(node) {
  const mock = CORE_KNOWLEDGE_MOCK[node.courseCode];
  if (mock) {
    return {
      left: mock.left || [],
      right: mock.right || [],
    };
  }

  const topics = fallbackTopics(node);
  const mode = (node.courseCode || '').length % 3;

  if (mode === 0) {
    return { left: topics.slice(0, 3), right: topics.slice(3) };
  }
  if (mode === 1) {
    return { left: topics, right: [] };
  }
  return { left: [], right: topics };
}

function KnowledgeCluster({ node, onSelectNode, attachCenterRef }) {
  const { left, right } = resolveKnowledgeBranches(node);
  const maxLane = Math.max(1, left.length, right.length);
  const clusterHeight = Math.max(200, maxLane * CHIP_STEP + 40);
  const centerY = clusterHeight / 2;
  const centerLeftX = BRANCH_SIDE_WIDTH + BRANCH_GAP;
  const centerRightX = BRANCH_SIDE_WIDTH + BRANCH_GAP + BRANCH_CENTER_WIDTH;

  const leftY = left.map((_, idx) => 20 + idx * CHIP_STEP + CHIP_HEIGHT / 2);
  const rightY = right.map((_, idx) => 20 + idx * CHIP_STEP + CHIP_HEIGHT / 2);

  const getStartY = (idx, total) => {
    const spread = 18;
    const offset = idx - (total - 1) / 2;
    return centerY + offset * spread;
  };

  return (
    <div className="skill-tree-cluster" style={{ height: `${clusterHeight}px` }}>
      <svg className="skill-tree-cluster__branches" viewBox={`0 0 ${BRANCH_TOTAL_WIDTH} ${clusterHeight}`} aria-hidden="true">
        {leftY.map((pointY, idx) => {
          const targetX = BRANCH_SIDE_WIDTH - 12;
          const startY = getStartY(idx, leftY.length);
          const d = `M ${centerLeftX} ${startY} L ${targetX} ${pointY}`;
          return <path key={`left-${idx}`} d={d} className="skill-tree-cluster__branch-line" />;
        })}

        {rightY.map((pointY, idx) => {
          const targetX = BRANCH_TOTAL_WIDTH - BRANCH_SIDE_WIDTH + 12;
          const startY = getStartY(idx, rightY.length);
          const d = `M ${centerRightX} ${startY} L ${targetX} ${pointY}`;
          return <path key={`right-${idx}`} d={d} className="skill-tree-cluster__branch-line" />;
        })}
      </svg>

      <div className="skill-tree-cluster__side skill-tree-cluster__side--left">
        {left.map((label, idx) => (
          <div key={`left-chip-${idx}`} className="skill-tree-knowledge-chip" style={{ top: `${leftY[idx] - CHIP_HEIGHT / 2}px` }}>
            {label}
          </div>
        ))}
      </div>

      <div className="skill-tree-cluster__center" ref={attachCenterRef}>
        <CourseNode node={node} onSelect={() => onSelectNode(node.courseCode)} />
      </div>

      <div className="skill-tree-cluster__side skill-tree-cluster__side--right">
        {right.map((label, idx) => (
          <div key={`right-chip-${idx}`} className="skill-tree-knowledge-chip" style={{ top: `${rightY[idx] - CHIP_HEIGHT / 2}px` }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * T023: Build React Flow canvas for skill tree visualization
 * For now: simplified grid layout without React Flow (can be enhanced later)
 */

export default function SkillTreeCanvas({ nodes = [], onSelectNode = () => {} }) {
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
  const [anchors, setAnchors] = useState({});

  const { levels, edges } = useMemo(() => {
    const nodeByCode = new Map((nodes || []).map((node) => [node.courseCode, node]));
    const depthCache = new Map();

    const getDepth = (courseCode, seen = new Set()) => {
      if (depthCache.has(courseCode)) {
        return depthCache.get(courseCode);
      }

      if (seen.has(courseCode)) {
        return 0;
      }

      const node = nodeByCode.get(courseCode);
      if (!node || !node.prerequisites || node.prerequisites.length === 0) {
        depthCache.set(courseCode, 0);
        return 0;
      }

      const nextSeen = new Set(seen);
      nextSeen.add(courseCode);

      const depth = Math.max(
        ...node.prerequisites
          .filter((prereqCode) => nodeByCode.has(prereqCode))
          .map((prereqCode) => getDepth(prereqCode, nextSeen) + 1),
        0
      );

      depthCache.set(courseCode, depth);
      return depth;
    };

    const grouped = new Map();
    (nodes || []).forEach((node) => {
      const depth = getDepth(node.courseCode);
      if (!grouped.has(depth)) {
        grouped.set(depth, []);
      }
      grouped.get(depth).push(node);
    });

    const sortedLevels = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map((entry) => ({
        depth: entry[0],
        nodes: entry[1].sort((a, b) => {
          const semesterA = Number(a.suggestedSemester || 0);
          const semesterB = Number(b.suggestedSemester || 0);
          if (semesterA !== semesterB) {
            return semesterA - semesterB;
          }
          return a.courseCode.localeCompare(b.courseCode);
        }),
      }));

    const graphEdges = [];
    (nodes || []).forEach((node) => {
      (node.prerequisites || []).forEach((prereqCode) => {
        if (nodeByCode.has(prereqCode)) {
          graphEdges.push({ from: prereqCode, to: node.courseCode });
        }
      });
    });

    return {
      levels: sortedLevels,
      edges: graphEdges,
    };
  }, [nodes]);

  useLayoutEffect(() => {
    const measureAnchors = () => {
      if (!containerRef.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const nextAnchors = {};

      Object.entries(nodeRefs.current).forEach(([courseCode, element]) => {
        if (!element) {
          return;
        }

        const rect = element.getBoundingClientRect();
        nextAnchors[courseCode] = {
          topX: rect.left - containerRect.left + rect.width / 2,
          topY: rect.top - containerRect.top,
          bottomX: rect.left - containerRect.left + rect.width / 2,
          bottomY: rect.bottom - containerRect.top,
        };
      });

      setAnchors(nextAnchors);
    };

    measureAnchors();

    const resizeObserver = new ResizeObserver(() => {
      measureAnchors();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    Object.values(nodeRefs.current).forEach((element) => {
      if (element) {
        resizeObserver.observe(element);
      }
    });

    window.addEventListener('resize', measureAnchors);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureAnchors);
    };
  }, [levels]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="skill-tree-empty-state">
        <p>No nodes available</p>
      </div>
    );
  }

  return (
    <div className="skill-tree-canvas">
      <div className="skill-tree-tree" ref={containerRef}>
        <svg className="skill-tree-tree__lines" aria-hidden="true">
          {edges.map((edge) => {
            const from = anchors[edge.from];
            const to = anchors[edge.to];
            if (!from || !to) {
              return null;
            }

            const midY = from.bottomY + Math.max(24, (to.topY - from.bottomY) / 2);
            const d = `M ${from.bottomX} ${from.bottomY} L ${from.bottomX} ${midY} L ${to.topX} ${midY} L ${to.topX} ${to.topY}`;

            return <path key={`${edge.from}->${edge.to}`} d={d} className="skill-tree-tree__path" />;
          })}
        </svg>

        <div className="skill-tree-tree__levels">
          {levels.map((level) => (
            <div className="skill-tree-tree__level" key={level.depth}>
              {level.nodes.map((node) => (
                <div
                  key={node.courseCode}
                  className="skill-tree-tree__node-slot"
                >
                  <KnowledgeCluster
                    node={node}
                    onSelectNode={onSelectNode}
                    attachCenterRef={(element) => {
                      nodeRefs.current[node.courseCode] = element;
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
