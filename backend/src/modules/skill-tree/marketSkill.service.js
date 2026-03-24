/**
 * T039: Market skills read service
 * Reads from market_skills and skill_learning_resources collections
 */

async function getMarketSkills(courseCode) {
  // Mock implementation - in production would query MongoDB market_skills
  return { skills: [] };
}

async function getLearningResources(skillName) {
  // Mock implementation - in production would query skill_learning_resources
  return { free: [], paid: [] };
}

module.exports = {
  getMarketSkills,
  getLearningResources,
};
