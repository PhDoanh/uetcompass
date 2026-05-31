'use strict';

const { Roadmap } = require('../roadmap/roadmap.model');
const skillService = require('../skill/skill.service');

const EMPTY_GROUPS = {
  textbook: [],
  slide: [],
  lab: [],
  assignment: [],
};

function groupResourceType(type) {
  if (type === 'textbook' || type === 'syllabus' || type === 'lecture_note' || type === 'docs' || type === 'documentation') {
    return 'textbook';
  }

  if (type === 'slide' || type === 'video') {
    return 'slide';
  }

  if (type === 'lab' || type === 'exercise' || type === 'project') {
    return 'lab';
  }

  return 'assignment';
}

function normalizeResource(item) {
  return {
    title: item.title,
    url: item.url,
    type: item.type,
    description: item.description || [item.sourceName, item.platform].filter(Boolean).join(' | '),
    courseCode: item.courseCode || '',
    courseName: item.courseName || '',
  };
}

async function resolveNodesForCourse(courseCode, userId) {
  const filter = {
    isPrimary: true,
    'nodes.relatedCourses.courseCode': courseCode,
  };

  if (userId) {
    filter.userId = userId;
  }

  const roadmap = await Roadmap.findOne(filter, { nodes: 1 }).lean();
  if (!roadmap || !Array.isArray(roadmap.nodes)) {
    return [];
  }

  return roadmap.nodes.filter((node) =>
    (node.relatedCourses || []).some((course) => course.courseCode === courseCode)
  );
}

async function getResources(courseCode, userId = null) {
  const nodes = await resolveNodesForCourse(courseCode, userId);
  if (nodes.length === 0) {
    return { ...EMPTY_GROUPS };
  }

  const hydratedNodes = await skillService.hydrateNodesWithSkillCuration(nodes);
  const grouped = { ...EMPTY_GROUPS };
  const seen = new Set();

  for (const node of hydratedNodes) {
    for (const resource of node.resources || []) {
      if (!resource?.url || resource.type === 'job') continue;
      const key = resource.url;
      if (seen.has(key)) continue;
      seen.add(key);

      const group = groupResourceType(resource.type);
      grouped[group].push(normalizeResource(resource));
    }
  }

  return grouped;
}

module.exports = {
  getResources,
  resolveNodesForCourse,
};
