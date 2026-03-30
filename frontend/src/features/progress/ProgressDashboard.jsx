import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { getRoadmapNodes, getSummaries } from '../../services/progress.api';
import RoadmapCard from './RoadmapCard';
import RoadmapDetailView from './RoadmapDetailView';
import useProgressSSE, { mergeSummaryIntoRoadmaps } from './useProgressSSE';

export function getRoadmapIdFromLocation(searchValue) {
  const params = new URLSearchParams(searchValue || '');
  return params.get('roadmapId') || '';
}

function updateRoadmapIdInLocation(roadmapId) {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  if (roadmapId) {
    url.searchParams.set('roadmapId', roadmapId);
  } else {
    url.searchParams.delete('roadmapId');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export default function ProgressDashboard() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(() =>
    typeof window === 'undefined' ? '' : getRoadmapIdFromLocation(window.location.search)
  );
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedRoadmap = useMemo(
    () => roadmaps.find((item) => item.roadmapId === selectedRoadmapId) || null,
    [roadmaps, selectedRoadmapId]
  );

  const loadSummaries = useCallback(async () => {
    if (!accessToken) {
      setRoadmaps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await getSummaries(accessToken);
      setRoadmaps(items);

      if (!selectedRoadmapId && items[0]?.roadmapId) {
        setSelectedRoadmapId(items[0].roadmapId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedRoadmapId]);

  const loadDetail = useCallback(
    async (roadmapId) => {
      if (!accessToken || !roadmapId) {
        setDetail(null);
        return;
      }

      setDetailLoading(true);
      try {
        const data = await getRoadmapNodes(accessToken, roadmapId);
        setDetail(data);
      } catch (err) {
        setError(err);
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    updateRoadmapIdInLocation(selectedRoadmapId);
    loadDetail(selectedRoadmapId);
  }, [selectedRoadmapId, loadDetail]);

  useProgressSSE({
    sseToken: accessToken,
    onSummaryUpdated: (summary) => {
      setRoadmaps((current) => mergeSummaryIntoRoadmaps(current, summary));
      if (summary?.roadmapId === selectedRoadmapId) {
        loadDetail(selectedRoadmapId);
      }
    },
    onUnauthorized: () => {
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  if (loading) {
    return <div className="p-6 text-gray-600">Loading progress dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-700">{error.message || 'Failed to load progress dashboard.'}</div>;
  }

  return (
    <main className="max-w-6xl mx-auto p-6 grid gap-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Progress Dashboard</h1>
        <p className="text-gray-600 mt-1">Track learning progress across all owned roadmaps.</p>
      </header>

      {roadmaps.length === 0 ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
          You do not have any owned roadmaps yet. Complete onboarding to generate your first roadmap.
        </section>
      ) : (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="grid gap-3 max-h-[70vh] overflow-auto pr-1">
            {roadmaps.map((roadmap) => (
              <RoadmapCard
                key={roadmap.roadmapId}
                roadmap={roadmap}
                selected={roadmap.roadmapId === selectedRoadmapId}
                onSelect={() => setSelectedRoadmapId(roadmap.roadmapId)}
              />
            ))}
          </div>

          <div>
            <RoadmapDetailView detail={detail || (selectedRoadmap ? { ...selectedRoadmap, nodes: { done: [], inProgress: [], pending: [] } } : null)} loading={detailLoading} />
          </div>
        </section>
      )}
    </main>
  );
}
