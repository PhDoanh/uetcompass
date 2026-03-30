import React from 'react';
import NodeListItem from './NodeListItem';

function Group({ title, nodes, emptyLabel, roadmapId }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4 bg-white">
      <h4 className="font-semibold text-gray-900">{title} ({nodes.length})</h4>
      {nodes.length === 0 ? (
        <p className="text-sm text-gray-500 mt-2">{emptyLabel}</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {nodes.map((node) => (
            <NodeListItem key={`${title}-${node.nodeId || node.courseCode}`} roadmapId={roadmapId} node={node} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function RoadmapDetailView({ detail, loading = false }) {
  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600">Loading roadmap detail...</div>;
  }

  if (!detail) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600">Select a roadmap to view node detail.</div>;
  }

  const done = detail?.nodes?.done || [];
  const inProgress = detail?.nodes?.inProgress || [];
  const pending = detail?.nodes?.pending || [];

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-gray-900">{detail.roadmapName}</h3>
        <p className="text-sm text-gray-600">Roadmap ID: {detail.roadmapId}</p>
      </div>

      <Group title="Done" nodes={done} emptyLabel="No done nodes yet." roadmapId={detail.roadmapId} />
      <Group title="In Progress" nodes={inProgress} emptyLabel="No in-progress nodes right now." roadmapId={detail.roadmapId} />
      <Group title="Pending" nodes={pending} emptyLabel="No pending nodes remaining." roadmapId={detail.roadmapId} />
    </div>
  );
}
