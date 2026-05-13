import React from 'react';

function formatRate(rate) {
  if (!Number.isFinite(rate)) {
    return '0%';
  }

  return `${Math.round(rate * 100)}%`;
}

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function TrackingTables({
  data,
  loading,
  error,
  scope,
  groupBy,
  onScopeChange,
  onGroupByChange,
  canUseRoadmapScope,
  selectedRoadmapName,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Learning frequency & completion rate</h2>
          <p className="text-sm text-slate-600">
            {scope === 'roadmap'
              ? `Scope: ${selectedRoadmapName || 'Selected roadmap'}`
              : 'Scope: All owned roadmaps'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onScopeChange('all')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                scope === 'all'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All roadmaps
            </button>
            <button
              type="button"
              onClick={() => onScopeChange('roadmap')}
              disabled={!canUseRoadmapScope}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                scope === 'roadmap'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              } ${!canUseRoadmapScope ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              This roadmap
            </button>
          </div>
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onGroupByChange('weekly')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                groupBy === 'weekly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => onGroupByChange('monthly')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                groupBy === 'monthly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading tracking tables...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message || 'Failed to load tracking tables.'}
        </div>
      ) : data ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryRow label="Total nodes" value={data.summary?.totalNodes ?? 0} />
            <SummaryRow label="Completed nodes" value={data.summary?.completedNodes ?? 0} />
            <SummaryRow label="Completion rate" value={formatRate(data.summary?.completionRate ?? 0)} />
          </div>

          {data.buckets?.length ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-5 gap-2 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Period</span>
                <span>Active days</span>
                <span>Completed</span>
                <span>Rate</span>
                <span>Range</span>
              </div>
              <div className="divide-y divide-slate-100">
                {data.buckets.map((bucket) => (
                  <div
                    key={`${bucket.periodStart}-${bucket.periodEnd}`}
                    className="grid grid-cols-5 gap-2 px-4 py-3 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-900">{bucket.periodStart}</span>
                    <span>{bucket.activeDays}</span>
                    <span>{bucket.completedNodes}</span>
                    <span>{formatRate(bucket.completionRate)}</span>
                    <span className="text-xs text-slate-500">{bucket.periodStart} - {bucket.periodEnd}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No activity recorded for this period yet.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          Select a roadmap to view tracking tables.
        </div>
      )}
    </section>
  );
}
