/**
 * T038: Course resources read service
 * Reads from course_resources collection and groups by type
 */

async function getResources(courseCode) {
  // Mock implementation - in production would query MongoDB
  const resourcesByType = {
    textbook: [],
    slide: [],
    lab: [],
    assignment: [],
  };

  // Placeholder return
  return resourcesByType;
}

module.exports = {
  getResources,
};
