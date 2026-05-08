/**
 * T025: Student Catalog Service (User Story 2)
 * Fetches StudentProfile data for personalization
 */

const mongoose = require('mongoose');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch StudentProfile by studentId with optional caching
 * @param {string} studentId - The student ID
 * @returns {Promise<object>} Student profile with {major, careerGoal}
 */
async function fetchStudentProfile(studentId) {
  try {
    // Check cache
    const cached = cache.get(studentId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.profile;
    }

    // Query database
    const profile = await mongoose.connection
      .collection('student_profiles')
      .findOne({ _id: new mongoose.Types.ObjectId(studentId) });

    if (profile) {
      // Cache result
      cache.set(studentId, {
        profile,
        timestamp: Date.now()
      });
      return profile;
    }

    return null;
  } catch (error) {
    console.error('[StudentCatalog] Failed to fetch profile:', error.message);
    throw error;
  }
}

/**
 * Get all student profiles for aggregated personalization
 * @returns {Promise<Array>} Array of student profiles
 */
async function getAllStudentProfiles() {
  try {
    const profiles = await mongoose.connection
      .collection('student_profiles')
      .find({})
      .toArray();

    return profiles;
  } catch (error) {
    console.error('[StudentCatalog] Failed to fetch all profiles:', error.message);
    throw error;
  }
}

module.exports = {
  fetchStudentProfile,
  getAllStudentProfiles
};
