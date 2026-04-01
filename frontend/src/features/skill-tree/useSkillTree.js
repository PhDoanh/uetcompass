import { useEffect, useRef } from 'react';
import { useSkillTreeStore } from '../../stores/skillTreeStore';
import * as skillTreeApi from '../../services/skillTree.api';
import { retryRoadmapGeneration } from '../../services/roadmap.api';

/**
 * T016: Create polling hook with visibility pause/resume
 */

export function useSkillTree() {
  const {
    nodes,
    roadmapName,
    activeCourseId,
    activeTab,
    activeSkillName,
    needsRepersonalization,
    repersonalizing,
    loading,
    error,
    setTreeData,
    setLoading,
    setError,
    updateNodeStatus,
    openCourse,
    closeCourse,
    setActiveTab,
    openSkill,
    closeSkill,
    updateNodeStatus: updateStatus,
    setRepersonalizing,
    setNeedsRepersonalization,
    refetchCount,
  } = useSkillTreeStore();

  const pollIntervalRef = useRef(null);
  const authTokenRef = useRef(localStorage.getItem('authToken') || '');

  // Initial data fetch
  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        const data = await skillTreeApi.getTree(authTokenRef.current);
        setTreeData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [refetchCount]);

  // Polling for repersonalization completion
  useEffect(() => {
    if (!needsRepersonalization || !repersonalizing) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const data = await skillTreeApi.getTree(authTokenRef.current);
        setTreeData(data);
        if (!data.repersonalizing) {
          setNeedsRepersonalization(false);
          setRepersonalizing(false);
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollIntervalRef.current = setInterval(poll, 2500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [needsRepersonalization, repersonalizing]);

  // Pause polling when tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      } else if (!document.hidden && repersonalizing && needsRepersonalization) {
        // Resume polling
        const poll = async () => {
          try {
            const data = await skillTreeApi.getTree(authTokenRef.current);
            setTreeData(data);
            if (!data.repersonalizing) {
              setNeedsRepersonalization(false);
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
  }, [repersonalizing, needsRepersonalization]);

  const transitionNode = async (courseCode, status) => {
    try {
      // Optimistic update
      updateNodeStatus(courseCode, status);

      // Actual update
      await skillTreeApi.patchNodeStatus(authTokenRef.current, courseCode, status);

      // Sync with server state
      const data = await skillTreeApi.getTree(authTokenRef.current);
      setTreeData(data);
    } catch (err) {
      // Rollback on error
      const data = await skillTreeApi.getTree(authTokenRef.current);
      setTreeData(data);
      setError(err);
    }
  };

  const triggerRepersonalize = async () => {
    try {
      setRepersonalizing(true);
      await retryRoadmapGeneration(authTokenRef.current);
      // Polling will handle the completion
    } catch (err) {
      setRepersonalizing(false);
      setError(err);
    }
  };

  return {
    nodes,
    roadmapName,
    activeCourseId,
    activeTab,
    activeSkillName,
    needsRepersonalization,
    repersonalizing,
    loading,
    error,
    openCourse,
    closeCourse,
    setActiveTab,
    openSkill,
    closeSkill,
    transitionNode,
    triggerRepersonalize,
  };
}
