// Validation helpers for Skill Tree endpoints

function validateStatus(status) {
  const validStatuses = ['pending', 'in_progress', 'done'];
  if (!status || !validStatuses.includes(status)) {
    return { valid: false, error: 'Invalid status. Must be one of: pending, in_progress, done' };
  }
  return { valid: true };
}

function validateCourseCode(courseCode) {
  if (!courseCode || typeof courseCode !== 'string') {
    return { valid: false, error: 'Course code is required and must be a string' };
  }
  // UET course codes are typically IT<numbers>
  if (!/^[A-Z]{2,3}\d{3,4}[A-Z]?$/.test(courseCode)) {
    return { valid: false, error: 'Invalid course code format' };
  }
  return { valid: true };
}

function getNextStatus(currentStatus) {
  const transitions = {
    pending: 'in_progress',
    in_progress: 'done',
    done: 'done', // no further transition
  };
  return transitions[currentStatus] || 'pending';
}

module.exports = {
  validateStatus,
  validateCourseCode,
  getNextStatus,
};
