const SkillTrendSnapshot = require('../scraping/models/skillTrendSnapshot.model');
const LearningResource = require('../scraping/models/learningResource.model');
const { RESOURCE_MAX_RESULTS } = require('../scraping/adapters/tavily.adapter');
const skillService = require('../skill/skill.service');
const Roadmap = require('../roadmap/roadmap.model');

async function resolveCourseName(courseCode) {
  const roadmap = await Roadmap.findOne(
    { isPrimary: true, 'nodes.relatedCourses.courseCode': courseCode },
    { nodes: 1 }
  ).lean();
  if (!roadmap || !Array.isArray(roadmap.nodes)) {
    return null;
  }

  const node = roadmap.nodes.find((item) =>
    (item.relatedCourses || []).some((course) => course.courseCode === courseCode)
  );
  const course = (node?.relatedCourses || []).find((item) => item.courseCode === courseCode);
  return course?.courseName || null;
}

async function getMarketSkills(courseCode) {
  const courseName = await resolveCourseName(courseCode);
  if (!courseName) {
    return { courseCode, skills: [] };
  }

  const snapshots = await SkillTrendSnapshot.find({ courseName }).sort({ snapshotDate: -1, jobCount: -1 }).lean();
  const bySkill = new Map();

  snapshots.forEach((snapshot) => {
    const existing = bySkill.get(snapshot.skillName);
    if (!existing || snapshot.jobCount > existing.jobCount) {
      bySkill.set(snapshot.skillName, {
        name: snapshot.skillName,
        jobCount: snapshot.jobCount,
      });
    }
  });

  return {
    courseCode,
    skills: [...bySkill.values()].sort((a, b) => b.jobCount - a.jobCount),
  };
}

async function getLearningResources(skillName) {
  const curated = await skillService.getLearningResourcesBySkill(skillName);
  if (curated.resources.free.length > 0 || curated.relatedJobs.length > 0) {
    return curated;
  }

  const resources = await LearningResource.find({ skillName, isAvailable: true })
    .sort({ 'qualitySignal.value': -1 })
    .limit(200)
    .lean();

  const normalized = resources.map((item) => ({
    title: item.title,
    url: item.url,
    platform: item.sourcePlatform,
    isFree: item.isFree,
  }));

  const free = normalized
    .filter((item) => item.isFree)
    .slice(0, RESOURCE_MAX_RESULTS)
    .map((item) => ({
      title: item.title,
      url: item.url,
      platform: item.platform,
    }));

  const paid = normalized
    .filter((item) => !item.isFree)
    .slice(0, RESOURCE_MAX_RESULTS)
    .map((item) => ({
      title: item.title,
      url: item.url,
      platform: item.platform,
    }));

  return {
    skill: skillName,
    resources: {
      free,
      paid,
    },
  };
}

module.exports = {
  getMarketSkills,
  getLearningResources,
};
