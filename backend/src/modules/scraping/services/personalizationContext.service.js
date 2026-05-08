/**
 * T024: Personalization Context Service (User Story 2)
 * Enriches Tavily queries with StudentProfile data
 */

/**
 * Enrich a Tavily query with personalization context from StudentProfile
 * @param {string} courseName - Base course name
 * @param {object} studentProfile - Student profile with {major, careerRole, companyType}
 * @returns {string} Enriched query string
 */
function enrichQueryWithPersonalization(courseName, studentProfile) {
  if (!studentProfile) {
    return `${courseName} skills job market demand trending`;
  }

  const { major, careerRole, companyType } = studentProfile;
  let query = `${courseName} skills job market`;

  if (major) {
    query += ` ${major}`;
  }
  if (careerRole) {
    query += ` ${careerRole}`;
  }
  if (companyType) {
    query += ` ${companyType}`;
  }

  return query;
}

module.exports = {
  enrichQueryWithPersonalization
};
