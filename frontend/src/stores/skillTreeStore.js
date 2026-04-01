import { create } from 'zustand';

/**
 * T015: Create Zustand store for node/panel/tab state
 */

export const useSkillTreeStore = create((set) => ({
  // Tree data
  nodes: [],
  roadmapId: null,
  roadmapName: null,
  careerGoal: null,

  // UI panel state
  activeCourseId: null,
  activeTab: 'resources', // 'resources', 'why', 'skills'
  activeSkillName: null,

  // Feature state
  needsRepersonalization: false,
  repersonalizing: false,

  // Loading/error
  loading: false,
  error: null,

  // Refetch trigger — increment to force useSkillTree to re-fetch
  refetchCount: 0,

  // Actions
  setTreeData: (data) => set((state) => ({
    nodes: data.nodes || [],
    roadmapId: data.roadmapId,
    roadmapName: data.roadmapName,
    careerGoal: data.careerGoal,
    needsRepersonalization: data.needsRepersonalization || false,
    repersonalizing: data.repersonalizing || false,
    error: null,
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  updateNodeStatus: (courseCode, status) => set((state) => {
    const nodes = state.nodes.map((node) => {
      if (node.courseCode === courseCode) {
        return { ...node, status };
      }
      return node;
    });
    return { nodes };
  }),

  openCourse: (courseCode) => set({
    activeCourseId: courseCode,
    activeTab: 'resources',
    activeSkillName: null,
  }),

  closeCourse: () => set({
    activeCourseId: null,
    activeTab: 'resources',
    activeSkillName: null,
  }),

  setActiveTab: (tab) => set({
    activeTab: tab,
    activeSkillName: null, // Reset skill selection when changing tabs
  }),

  openSkill: (skillName) => set({ activeSkillName: skillName }),
  closeSkill: () => set({ activeSkillName: null }),

  setRepersonalizing: (repersonalizing) => set({ repersonalizing }),
  setNeedsRepersonalization: (needs) => set({ needsRepersonalization: needs }),

  requestRefetch: () => set((state) => ({ refetchCount: state.refetchCount + 1 })),
}));
