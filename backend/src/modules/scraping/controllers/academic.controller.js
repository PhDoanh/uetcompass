/**
 * T014: Academic Materials Controller (User Story 1)
 * Thin handler layer for academic materials endpoints
 */

const AcademicDocument = require('../models/academicDocument.model');

/**
 * GET /api/academic/node/:roadmapNodeId
 * Returns academic materials for a specific course node, sorted by source priority
 * Only visible documents (confidence >= medium) are returned
 */
async function getAcademicByNode(req, res) {
  try {
    const { roadmapNodeId } = req.params;

    // Query visible documents only, sorted by sourceType priority
    const documents = await AcademicDocument
      .find({
        roadmapNodeId,
        isVisible: true
      })
      .sort({
        sourceType: 1, // uet_official < github < external (alphabetical)
        createdAt: -1 // newest first within each source type
      })
      .lean();

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
      roadmapNodeId,
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
  getAcademicByNode
};
