import { useEffect, useRef } from 'react';
import { useSkillTreeStore } from '../../stores/skillTreeStore';
import * as skillTreeApi from '../../services/skillTree.api';
import { acceptPrimaryRoadmap } from '../../services/roadmap.api';
import { retryRoadmapGeneration } from '../../services/roadmap.api';
import { buildSkillTreeGraph } from './graphTransform';

/**
 * T016: Create polling hook with visibility pause/resume
 */

export function useSkillTree() {
  const {
    nodes,
    edges,
    roadmapId,
    roadmapName,
    personalisationLevel,
    createdAt,
    acceptedAt,
    progress,
    activeNodeId,
    isRetryable,
    repersonalizing,
    loading,
    error,
    setTreeData,
    setLoading,
    setError,
    updateProgressState,
    openNode,
    closeNode,
    setRepersonalizing,
    setRetryable,
    generationStatus,
    refetchCount,
  } = useSkillTreeStore();

  const pollIntervalRef = useRef(null);
  const authTokenRef = useRef(localStorage.getItem('authToken') || '');
  const autoAcceptingPreviewRef = useRef(false);
  const hiddenRetryInFlightRef = useRef(false);
  const hiddenRetryLastAtRef = useRef(0);
  const generationStartedAtRef = useRef(0);

  async function tryBackgroundKickoffGeneration() {
    if (hiddenRetryInFlightRef.current || Date.now() - hiddenRetryLastAtRef.current <= 10000) {
      return;
    }

    try {
      hiddenRetryInFlightRef.current = true;
      hiddenRetryLastAtRef.current = Date.now();
      setRepersonalizing(true);
      await retryRoadmapGeneration(authTokenRef.current);
    } catch (_) {
      // Ignore CONFLICT/other transient errors; polling loop keeps trying in background.
    } finally {
      hiddenRetryInFlightRef.current = false;
    }
  }

  async function hydrateTreeData(rawData) {
    let data = rawData;
    const preview = rawData?.pendingPreview;

    if (
      rawData?.isRetryable &&
      preview &&
      !autoAcceptingPreviewRef.current &&
      String(preview.studentProfileId || '').trim() &&
      String(preview.roadmapName || '').trim() &&
      Array.isArray(preview.nodes) &&
      preview.nodes.length > 0
    ) {
      try {
        autoAcceptingPreviewRef.current = true;
        await acceptPrimaryRoadmap(authTokenRef.current, {
          studentProfileId: preview.studentProfileId,
          roadmapName: preview.roadmapName,
          personalisationLevel: preview.personalisationLevel === 'low' ? 'low' : 'full',
          isPrimary: true,
          nodes: preview.nodes,
        });
        data = await skillTreeApi.getTree(authTokenRef.current);
      } finally {
        autoAcceptingPreviewRef.current = false;
      }
    }

    const graph = buildSkillTreeGraph(data?.nodes || [], data?.progress || {});
    setTreeData({ ...data, nodes: graph.nodes, edges: graph.edges });

    // Hidden retry path: when generation failed and became retryable, retry in background.
    if (
      data?.generationStatus === 'retryable_failed' &&
      !hiddenRetryInFlightRef.current &&
      Date.now() - hiddenRetryLastAtRef.current > 10000
    ) {
      try {
        hiddenRetryInFlightRef.current = true;
        hiddenRetryLastAtRef.current = Date.now();
        setRepersonalizing(true);
        await retryRoadmapGeneration(authTokenRef.current);
      } catch (_) {
        // Keep status visible; another hidden retry attempt will be scheduled later.
        setRepersonalizing(false);
      } finally {
        hiddenRetryInFlightRef.current = false;
      }
    }

    if (data?.generationStatus === 'generating' || data?.generationStatus === 'preview_ready') {
      setRepersonalizing(true);
    }

    if (data?.generationStatus === 'ready' || data?.generationStatus === 'empty_accepted') {
      setRepersonalizing(false);
      setRetryable(false);
      hiddenRetryLastAtRef.current = 0;
    }

    return data;
  }

  // Initial data fetch
  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        const data = await skillTreeApi.getTree(authTokenRef.current);
        await hydrateTreeData(data);
      } catch (err) {
        if (err?.code === 'ROADMAP_NOT_FOUND') {
          if (!generationStartedAtRef.current) {
            generationStartedAtRef.current = Date.now();
          }

          const elapsed = Date.now() - generationStartedAtRef.current;
          const status = elapsed > 90000 ? 'generation_delayed' : 'generating';

          await tryBackgroundKickoffGeneration();

          setTreeData({
            nodes: [],
            edges: [],
            roadmapId: null,
            roadmapName: null,
            personalisationLevel: 'full',
            createdAt: null,
            acceptedAt: null,
            progress: { pending: [], inProgress: [], completed: [], skip: [] },
            isRetryable: false,
            generationStatus: status,
          });
          setRepersonalizing(true);
        } else {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [refetchCount]);

  // Polling for regeneration completion
  useEffect(() => {
    if (!repersonalizing) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const data = await skillTreeApi.getTree(authTokenRef.current);
        const hydrated = await hydrateTreeData(data);
        if (hydrated.generationStatus === 'ready' || hydrated.generationStatus === 'empty_accepted') {
          generationStartedAtRef.current = 0;
          setRetryable(false);
          setRepersonalizing(false);
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } catch (err) {
        if (err?.code === 'ROADMAP_NOT_FOUND') {
          if (!generationStartedAtRef.current) {
            generationStartedAtRef.current = Date.now();
          }

          const elapsed = Date.now() - generationStartedAtRef.current;
          const status = elapsed > 90000 ? 'generation_delayed' : 'generating';

          await tryBackgroundKickoffGeneration();

          setTreeData({
            nodes: [],
            edges: [],
            roadmapId: null,
            roadmapName: null,
            personalisationLevel: 'full',
            createdAt: null,
            acceptedAt: null,
            progress: { pending: [], inProgress: [], completed: [], skip: [] },
            isRetryable: false,
            generationStatus: status,
          });
        } else {
          console.error('Polling error:', err);
        }
      }
    };

    pollIntervalRef.current = setInterval(poll, 2500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [repersonalizing]);

  // Pause polling when tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      } else if (!document.hidden && repersonalizing) {
        // Resume polling
        const poll = async () => {
          try {
            const data = await skillTreeApi.getTree(authTokenRef.current);
            const hydrated = await hydrateTreeData(data);
            if (hydrated.generationStatus === 'ready' || hydrated.generationStatus === 'empty_accepted') {
              setRetryable(false);
              setRepersonalizing(false);
            }
          } catch (err) {
            console.error('Polling error:', err);
          }
        };
        pollIntervalRef.current = setInterval(poll, 2500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [repersonalizing]);

  const transitionNode = async (nodeId, fromState, toState) => {
    try {
      // Optimistic update
      updateProgressState({ nodeId, fromState, toState });

      // Actual update
      const updated = await skillTreeApi.patchNodeStatus(
        authTokenRef.current,
        roadmapId,
        nodeId,
        fromState,
        toState
      );

      // Sync with server state
      const data = await skillTreeApi.getTree(authTokenRef.current);
      const graph = buildSkillTreeGraph(data.nodes || [], updated?.state || data.progress || {});
      setTreeData({ ...data, progress: updated?.state || data.progress, nodes: graph.nodes, edges: graph.edges });
    } catch (err) {
      // Rollback on error
      const data = await skillTreeApi.getTree(authTokenRef.current);
      const graph = buildSkillTreeGraph(data.nodes || [], data.progress || {});
      setTreeData({ ...data, nodes: graph.nodes, edges: graph.edges });
      setError(err);
    }
  };

  return {
    nodes,
    edges,
    roadmapId,
    roadmapName,
    personalisationLevel,
    createdAt,
    acceptedAt,
    progress,
    activeNodeId,
    isRetryable,
    repersonalizing,
    generationStatus,
    loading,
    error,
    openNode,
    closeNode,
    transitionNode,
  };
}
