/**
 * T039: Market skills read service
 * Reads from market_skills and skill_learning_resources collections
 * Currently returns placeholder structure; real implementation would query MongoDB
 */

/**
 * Get market skills associated with a course
 * @param {string} courseCode - Course code
 * @returns {Promise<Object>} - Object with skills array
 */
async function getMarketSkills(courseCode) {
  // TODO: Implement MongoDB query to market_skills collection
  // Expected schema:
  // {
  //   courseCode: String,
  //   skill: String,           // e.g., "React.js", "Node.js"
  //   relevance: Number,       // 0-100, higher = more relevant
  //   jobPostingCount: Number, // How many job postings mention this skill
  //   source: String           // "vietnamese-job-platforms"
  // }
  
  return {
    courseCode,
    skills: [], // [{ skill, relevance, jobPostingCount }]
  };
}

/**
 * Get learning resources for a specific market skill
 * @param {string} skillName - Skill name
 * @returns {Promise<Object>} - Free and paid learning resources
 */
async function getLearningResources(skillName) {
  // TODO: Implement MongoDB query to skill_learning_resources collection
  // Expected schema:
  // {
  //   skill: String,
  //   type: 'free' | 'paid',
  //   title: String,
  //   url: String,
  //   provider: String,         // e.g., "Udemy", "Coursera", "YouTube"
  //   description: String,
  //   durationHours: Number
  // }
  
  return {
    skill: skillName,
    free: [],   // [{ title, url, provider, description, durationHours }]
    paid: [],   // [{ title, url, provider, description, durationHours }]
  };
}

module.exports = {
  getMarketSkills,
  getLearningResources,
};
