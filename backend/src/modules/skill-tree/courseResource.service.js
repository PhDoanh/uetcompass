const { Roadmap } = require('../roadmap/roadmap.model');
const AcademicDocument = require('../scraping/models/academicDocument.model');
const LearningResource = require('../scraping/models/learningResource.model');
const SkillTrendSnapshot = require('../scraping/models/skillTrendSnapshot.model');
const { ACADEMIC_MAX_RESULTS, RESOURCE_MAX_RESULTS } = require('../scraping/adapters/tavily.adapter');

async function resolveCourseName(courseCode) {
  const roadmap = await Roadmap.findOne({ isPrimary: true, status: 'completed', 'nodes.courseCode': courseCode }, { nodes: 1 }).lean();
  if (!roadmap || !Array.isArray(roadmap.nodes)) {
    return null;
  }

  const node = roadmap.nodes.find((item) => item.courseCode === courseCode);
  return node?.courseName || null;
}

function normalizeAcademicToResource(item) {
  return {
    title: item.title,
    url: item.url,
    description: `${item.sourceType} · ${item.documentType}`,
  };
}

function normalizeLearningToResource(item) {
  return {
    title: item.title,
    url: item.url,
    description: `${item.sourcePlatform} · ${item.resourceType}`,
  };
}

function backfillIfEmpty(targetList, fallbackPool, maxSize) {
  if (targetList.length > 0) {
    return targetList;
  }

  return fallbackPool.slice(0, Math.max(1, Math.min(maxSize, 3)));
}

async function getResources(courseCode) {
  const courseName = await resolveCourseName(courseCode);
  if (!courseName) {
    return { textbook: [], slide: [], lab: [], assignment: [] };
  }

  const [academicDocs, snapshots] = await Promise.all([
    AcademicDocument.find({ courseName, isVisible: true }).limit(50).lean(),
    SkillTrendSnapshot.find({ courseName }).select({ _id: 1 }).lean(),
  ]);

  const snapshotIds = snapshots.map((snapshot) => snapshot._id);
  const learningResources = snapshotIds.length
    ? await LearningResource.find({ skillTrendSnapshotId: { $in: snapshotIds }, isAvailable: true }).limit(100).lean()
    : [];

  const textbooks = academicDocs
    .filter((item) => item.documentType === 'syllabus' || item.documentType === 'lecture_note')
    .slice(0, ACADEMIC_MAX_RESULTS)
    .map(normalizeAcademicToResource);

  const slides = academicDocs
    .filter((item) => item.documentType === 'slide')
    .slice(0, ACADEMIC_MAX_RESULTS)
    .map(normalizeAcademicToResource);

  const labs = academicDocs
    .filter((item) => item.documentType === 'exercise' || item.documentType === 'code_sample')
    .slice(0, ACADEMIC_MAX_RESULTS)
    .map(normalizeAcademicToResource);

  const assignments = learningResources
    .filter((item) => item.resourceType === 'course' || item.resourceType === 'tutorial' || item.resourceType === 'video')
    .slice(0, RESOURCE_MAX_RESULTS)
    .map(normalizeLearningToResource);

  const academicFallback = academicDocs.map(normalizeAcademicToResource);
  const learningFallback = learningResources.map(normalizeLearningToResource);

  const textbookFinal = backfillIfEmpty(textbooks, academicFallback, ACADEMIC_MAX_RESULTS);
  const slideFinal = backfillIfEmpty(slides, academicFallback.slice(1), ACADEMIC_MAX_RESULTS);
  const labFinal = backfillIfEmpty(labs, academicFallback.slice(2), ACADEMIC_MAX_RESULTS);
  const assignmentFinal = backfillIfEmpty(assignments, learningFallback, RESOURCE_MAX_RESULTS);

  return {
    textbook: textbookFinal,
    slide: slideFinal,
    lab: labFinal,
    assignment: assignmentFinal,
  };
}

module.exports = {
  getResources,
};
