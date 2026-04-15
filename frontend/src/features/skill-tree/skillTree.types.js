export const NODE_TYPES = {
  TOPIC: 'topic',
  SUBTOPIC: 'subtopic',
};

export const PROGRESS_STATES = {
  PENDING: 'pending',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  SKIP: 'skip',
};

export const ALLOWED_TRANSITIONS = {
  pending: ['inProgress', 'completed', 'skip'],
  inProgress: ['pending', 'completed', 'skip'],
  completed: ['pending', 'inProgress', 'skip'],
  skip: ['pending', 'inProgress', 'completed'],
};

export function getNextTransitionOptions(fromState) {
  return ALLOWED_TRANSITIONS[fromState] || [];
}

export function normalizeProgressState(state) {
  if (state === 'in_progress') return PROGRESS_STATES.IN_PROGRESS;
  if (state === 'done') return PROGRESS_STATES.COMPLETED;
  return state;
}
