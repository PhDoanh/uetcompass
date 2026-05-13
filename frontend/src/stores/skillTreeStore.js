import { create } from 'zustand';

/**
 * T015: Create Zustand store for node/panel/tab state
 */

export const useSkillTreeStore = create((set) => ({
  // Tree data
  nodes: [],
  edges: [],
  roadmapId: null,
  roadmapName: null,
  personalisationLevel: 'full',
  createdAt: null,
  acceptedAt: null,
  progress: { pending: [], inProgress: [], completed: [], skip: [] },

  // UI panel state
  activeNodeId: null,

  // Feature state
  isRetryable: false,
  repersonalizing: false,
  generationStatus: 'idle',

  // Loading/error
  loading: false,
  error: null,

  // Refetch trigger — increment to force useSkillTree to re-fetch
  refetchCount: 0,

  // Actions
  setTreeData: (data) => set((state) => ({
    nodes: data.nodes || [],
    edges: data.edges || [],
    roadmapId: data.roadmapId,
    roadmapName: data.roadmapName,
    personalisationLevel: data.personalisationLevel || 'full',
    createdAt: data.createdAt || null,
    acceptedAt: data.acceptedAt || null,
    progress: data.progress || { pending: [], inProgress: [], completed: [], skip: [] },
    isRetryable: !!data.isRetryable,
    generationStatus: data.generationStatus || 'idle',
    error: null,
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  updateProgressState: ({ nodeId, fromState, toState }) => set((state) => {
    const current = state.progress || { pending: [], inProgress: [], completed: [], skip: [] };

    const dedup = (arr) => (arr || []).filter((id) => id !== nodeId);
    const nextProgress = {
      pending: dedup(current.pending),
      inProgress: dedup(current.inProgress),
      completed: dedup(current.completed),
      skip: dedup(current.skip),
      [toState]: [...dedup(current[toState]), nodeId],
    };

    return {
      progress: nextProgress,
      nodes: (state.nodes || []).map((node) => {
        if (node?.nodeId !== nodeId) {
          return node;
        }

        return {
          ...node,
          progressState: toState,
        };
      }),
    };
  }),

  openNode: (nodeId) => set({
    activeNodeId: nodeId,
  }),

  closeNode: () => set({
    activeNodeId: null,
  }),

  setRepersonalizing: (repersonalizing) => set({ repersonalizing }),
  setRetryable: (retryable) => set({ isRetryable: retryable }),

  requestRefetch: () => set((state) => ({ refetchCount: state.refetchCount + 1 })),
}));
