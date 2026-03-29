/**
 * T014: Academic Materials Controller (User Story 1)
 * Thin handler layer for academic materials endpoints
 */

const AcademicDocument = require('../models/academicDocument.model');

/**
 * GET /api/academic/course/:courseCode
 * Returns academic materials for a specific course, sorted by source priority
 * Only visible documents are returned
 */
async function getAcademicByCourse(req, res) {
  try {
    const { courseCode } = req.params;

    // Query visible documents only
    const documents = await AcademicDocument
      .find({
        courseCode,
        isVisible: true
      })
      .lean();

    // Sort by sourceType priority: uet_official (0) > github (1) > external (2)
    // Then by createdAt descending (newest first within each priority)
    const SOURCE_PRIORITY = {
      'uet_official': 0,
      'github': 1,
      'external': 2
    };

    documents.sort((a, b) => {
      const priorityA = SOURCE_PRIORITY[a.sourceType] ?? 999;
      const priorityB = SOURCE_PRIORITY[b.sourceType] ?? 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower priority number first
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
    });

    // Get the course name from first document (if available)
    const courseName = documents.length > 0 ? documents[0].courseName : null;

    // Transform response format per rest-api.md contract
    const formattedDocs = documents.map(doc => ({
      documentId: doc._id,
      title: doc.title,
      url: doc.url,
      sourceType: doc.sourceType,
      documentType: doc.documentType,
      courseName: doc.courseName,
      skillName: doc.skillId ? '[skill-name-from-skillId]' : null // Optional skill label
    }));

    res.json({
      courseCode,
      courseName,
      documentCount: formattedDocs.length,
      documents: formattedDocs
    });

  } catch (error) {
    console.error('[AcademicController] Error fetching academic materials:', error.message);
    res.status(500).json({
      error: 'Failed to fetch academic materials',
      message: error.message
    });
  }
}

module.exports = {
  getAcademicByCourse
};
