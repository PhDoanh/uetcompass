import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { getRoadmapNodes, getSummaries, getTrackingTables } from '../../services/progress.api';
import RoadmapCard from './RoadmapCard';
import RoadmapDetailView from './RoadmapDetailView';
import TrackingTables from './TrackingTables';
import useProgressSSE, { mergeSummaryIntoRoadmaps } from './useProgressSSE';
import { getRoadmapIdFromLocation } from './progress.utils';

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
  const [trackingScope, setTrackingScope] = useState('all');
  const [trackingGroupBy, setTrackingGroupBy] = useState('weekly');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

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

  const loadTracking = useCallback(async () => {
    if (!accessToken) {
      setTrackingData(null);
      setTrackingLoading(false);
      return;
    }

    if (trackingScope === 'roadmap' && !selectedRoadmapId) {
      setTrackingData(null);
      setTrackingLoading(false);
      return;
    }

    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const apiGroupBy = trackingGroupBy === 'daily' ? 'weekly' : trackingGroupBy;
      const data = await getTrackingTables(accessToken, {
        scope: trackingScope,
        groupBy: apiGroupBy,
        roadmapId: trackingScope === 'roadmap' ? selectedRoadmapId : undefined,
      });
      setTrackingData(data);
    } catch (err) {
      setTrackingError(err);
    } finally {
      setTrackingLoading(false);
    }
  }, [accessToken, trackingScope, trackingGroupBy, selectedRoadmapId]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    updateRoadmapIdInLocation(selectedRoadmapId);
    loadDetail(selectedRoadmapId);
  }, [selectedRoadmapId, loadDetail]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  useProgressSSE({
    sseToken: accessToken,
    onSummaryUpdated: (summary) => {
      setRoadmaps((current) => mergeSummaryIntoRoadmaps(current, summary));
      if (summary?.roadmapId === selectedRoadmapId) {
        loadDetail(selectedRoadmapId);
      }
      loadTracking();
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
        <div className="grid gap-6">
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
              <RoadmapDetailView
                detail={
                  detail ||
                  (selectedRoadmap
                    ? { ...selectedRoadmap, nodes: { done: [], pending: [] } }
                    : null)
                }
                loading={detailLoading}
              />
            </div>
          </section>

          <TrackingTables
            data={trackingData}
            loading={trackingLoading}
            error={trackingError}
            scope={trackingScope}
            groupBy={trackingGroupBy}
            onScopeChange={setTrackingScope}
            onGroupByChange={setTrackingGroupBy}
            canUseRoadmapScope={Boolean(selectedRoadmapId)}
            selectedRoadmapName={selectedRoadmap?.roadmapName || ''}
          />
        </div>
      )}
    </main>
  );
}
