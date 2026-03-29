/**
 * T040: Resources Controller (User Story 3)
 * Handler layer for learning resources endpoints
 */

const LearningResource = require('../models/learningResource.model');

/**
 * GET /api/resources/skills/:skillName
 * Returns learning resources for a skill
 */
async function getResourcesBySkillName(req, res) {
  try {
    const { skillName } = req.params;

    // Find resources, sorted by quality signal descending
    const resources = await LearningResource
      .find({
        skillName,
        isAvailable: true
      })
      .sort({ 'qualitySignal.value': -1 })
      .limit(50)
      .lean();

    const formattedResources = resources.map(res => ({
      resourceId: res._id,
      title: res.title,
      url: res.url,
      sourcePlatform: res.sourcePlatform,
      resourceType: res.resourceType,
      isFree: res.isFree,
      qualitySignal: res.qualitySignal
    }));

    res.json({
      skillName,
      resourceCount: formattedResources.length,
      resources: formattedResources
    });

  } catch (error) {
    console.error('[ResourcesController] Error fetching resources:', error.message);
    res.status(500).json({
      error: 'Failed to fetch resources',
      message: error.message
    });
  }
}

module.exports = {
  getResourcesBySkillName
};
