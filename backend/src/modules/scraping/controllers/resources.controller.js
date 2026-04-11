/**
 * T040: Resources Controller (User Story 3)
 * Handler layer for learning resources endpoints
 */

const LearningResource = require('../models/learningResource.model');
const curationPipeline = require('../services/curationPipeline.service');

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

/**
 * POST /api/resources/crawl/trigger
 * Trigger Feature 003 pipeline from Feature 009 notification
 */
async function triggerCurationFromRoadmap(req, res) {
  try {
    const { nodes, studentProfileId = null, sourceFeature = '009-roadmap-generator' } = req.body || {};

    const pipelineResult = await curationPipeline.runTriggeredPipeline({
      nodes,
      studentProfileId
    });

    return res.status(200).json({
      sourceFeature,
      ...pipelineResult
    });
  } catch (error) {
    console.error('[ResourcesController] Triggered curation failed:', error.message);
    return res.status(400).json({
      status: 'failed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: {
        code: 'CURATION_TRIGGER_FAILED',
        message: error.message
      }
    });
  }
}

module.exports = {
  getResourcesBySkillName,
  triggerCurationFromRoadmap
};
