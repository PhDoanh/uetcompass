/**
 * T028: Market Trends Controller (User Story 2)
 * Thin handler layer for trends endpoints
 */

const SkillTrendSnapshot = require('../models/skillTrendSnapshot.model');

const TRENDS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedTrends = null;
let cachedTrendsTime = 0;

/**
 * GET /api/market/trends
 * Returns all active market trends ranked by job count
 */
async function getAllTrends(req, res) {
  try {
    // Cache check (5 minutes)
    const now = Date.now();
    if (cachedTrends && (now - cachedTrendsTime) < TRENDS_CACHE_DURATION) {
      return res.json(cachedTrends);
    }

    // Aggregate: get latest snapshot per skill
    const latestSnapshots = await SkillTrendSnapshot.aggregate([
      { $sort: { snapshotDate: -1 } },
      {
        $group: {
          _id: '$skillName',
          skillId: { $first: '$skillId' },
          jobCount: { $first: '$jobCount' },
          jobCountTrend: { $first: '$jobCountTrend' },
          averageSalaryRange: { $first: '$averageSalaryRange' },
          personalizationContext: { $first: '$personalizationContext' },
          lastSnapshot: { $first: '$snapshotDate' }
        }
      },
      { $sort: { jobCount: -1 } }
    ]);

    const response = {
      lastRefreshedAt: new Date(),
      trends: latestSnapshots.map(snapshot => ({
        skillId: snapshot.skillId,
        skillName: snapshot._id,
        jobCount: snapshot.jobCount,
        jobCountTrend: snapshot.jobCountTrend,
        averageSalaryRange: snapshot.averageSalaryRange,
        personalizationContext: snapshot.personalizationContext
      }))
    };

    // Cache response
    cachedTrends = response;
    cachedTrendsTime = now;

    res.json(response);

  } catch (error) {
    console.error('[TrendsController] Error fetching trends:', error.message);
    res.status(500).json({
      error: 'Failed to fetch market trends',
      message: error.message
    });
  }
}

/**
 * GET /api/market/trends/course/:courseName
 * Returns trends filtered to a specific course
 */
async function getTrendsByCourse(req, res) {
  try {
    const { courseName } = req.params;

    const snapshots = await SkillTrendSnapshot
      .find({ courseName })
      .sort({ snapshotDate: -1, jobCount: -1 })
      .lean();

    // Get latest per skill
    const latestPerSkill = new Map();
    snapshots.forEach(snap => {
      const key = snap.skillName;
      if (!latestPerSkill.has(key)) {
        latestPerSkill.set(key, snap);
      }
    });

    const trends = Array.from(latestPerSkill.values())
      .sort((a, b) => b.jobCount - a.jobCount)
      .map(snap => ({
        skillId: snap.skillId,
        skillName: snap.skillName,
        jobCount: snap.jobCount,
        jobCountTrend: snap.jobCountTrend,
        averageSalaryRange: snap.averageSalaryRange,
        personalizationContext: snap.personalizationContext
      }));

    res.json({
      courseName,
      lastRefreshedAt: snapshots[0]?.snapshotDate || null,
      trends
    });

  } catch (error) {
    console.error('[TrendsController] Error fetching node trends:', error.message);
    res.status(500).json({
      error: 'Failed to fetch trends',
      message: error.message
    });
  }
}

module.exports = {
  getAllTrends,
  getTrendsByCourse
};
