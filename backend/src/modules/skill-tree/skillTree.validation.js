const VALID_STATES = new Set(['pending', 'inProgress', 'completed', 'skip']);

const ALLOWED_TRANSITIONS = {
  pending: new Set(['inProgress', 'completed', 'skip']),
  inProgress: new Set(['pending', 'completed', 'skip']),
  completed: new Set(['pending', 'inProgress', 'skip']),
  skip: new Set(['pending', 'inProgress', 'completed']),
};

function validateNodeId(nodeId) {
  if (!nodeId || typeof nodeId !== 'string' || !nodeId.trim()) {
    return { valid: false, error: 'nodeId is required and must be a non-empty string.' };
  }
  return { valid: true };
}

function validateProgressState(state, fieldName) {
  if (!VALID_STATES.has(state)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: pending, inProgress, completed, skip.`,
    };
  }
  return { valid: true };
}

function validateProgressTransition(fromState, toState) {
  const fromValidation = validateProgressState(fromState, 'fromState');
  if (!fromValidation.valid) return fromValidation;

  const toValidation = validateProgressState(toState, 'toState');
  if (!toValidation.valid) return toValidation;

  if (!ALLOWED_TRANSITIONS[fromState].has(toState)) {
    return {
      valid: false,
      error: `Transition from '${fromState}' to '${toState}' is not allowed.`,
    };
  }

  return { valid: true };
}

module.exports = {
  validateNodeId,
  validateProgressState,
  validateProgressTransition,
};
