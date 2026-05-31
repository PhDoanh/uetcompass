import React from 'react';

function formatDate(dateLike) {
  if (!dateLike) {
    return 'No activity yet';
  }

  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return 'No activity yet';
  }

  return date.toLocaleDateString();
}

export default function RoadmapCard({ roadmap, onSelect, selected = false }) {
  const title = roadmap?.roadmapName || 'Untitled Roadmap';
  const done = roadmap?.doneNodes || 0;
  const total = roadmap?.totalNodes || 0;
  const pending = roadmap?.pendingNodes || 0;
  const percent = roadmap?.progressPercent || 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full cursor-pointer text-left rounded-xl border p-4 transition ${
        selected ? 'border-blue-500 shadow-md bg-blue-50' : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">Last activity: {formatDate(roadmap?.lastActivityDate)}</p>
        </div>
        {roadmap?.isPrimary ? (
          <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">Primary</span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Progress</span>
          <span className="font-semibold text-gray-900">{percent}%</span>
        </div>
        <div className="h-2 mt-2 rounded bg-gray-200 overflow-hidden">
          <div className="h-2 bg-blue-500" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2 text-xs text-gray-600">Done {done}/{total}</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-green-50 p-2 text-green-700">Done: {done}</div>
        <div className="rounded bg-gray-100 p-2 text-gray-700">Pending: {pending}</div>
      </div>
    </button>
  );
}
