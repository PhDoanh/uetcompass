const { ManualRoadmap } = require('../roadmap/manualRoadmap.model');
const SkillTrendSnapshot = require('../scraping/models/skillTrendSnapshot.model');
const LearningResource = require('../scraping/models/learningResource.model');
const { RESOURCE_MAX_RESULTS } = require('../scraping/adapters/tavily.adapter');

async function resolveCourseName(courseCode) {
  const roadmap = await ManualRoadmap.findOne(
    { isPrimary: true, 'nodes.metadata.relatedCourses.courseCode': courseCode },
    { nodes: 1 }
  ).lean();
  if (!roadmap || !Array.isArray(roadmap.nodes)) {
    return null;
  }

  for (const node of roadmap.nodes) {
    const courses = node.metadata?.relatedCourses;
    if (!Array.isArray(courses)) continue;
    const course = courses.find((rc) => rc.courseCode === courseCode);
    if (course?.courseName) return course.courseName;
  }
  return null;
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
    .map((item) => {
      const { isFree, ...rest } = item;
      void isFree;
      return rest;
    });

  const paid = normalized
    .filter((item) => !item.isFree)
    .slice(0, RESOURCE_MAX_RESULTS)
    .map((item) => {
      const { isFree, ...rest } = item;
      void isFree;
      return rest;
    });

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
