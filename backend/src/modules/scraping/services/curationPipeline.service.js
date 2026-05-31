'use strict';

const skillService = require('../../skill/skill.service');

function normalizeNodeForSkillCuration(node = {}) {
  const relatedCourses = Array.isArray(node.relatedCourses)
    ? node.relatedCourses
    : [];

  const fallbackCourse = node.courseName || node.courseCode
    ? [{
        courseCode: node.courseCode || '',
        courseName: node.courseName || '',
        credits: node.credits || null,
      }]
    : [];

  return {
    skillName: node.skillName || node.name || node.courseName || '',
    relatedCourses: [...relatedCourses, ...fallbackCourse],
  };
}

function normalizeNodes(nodes = []) {
  return nodes
    .filter((node) => node && typeof node === 'object')
    .map(normalizeNodeForSkillCuration)
    .filter((node) => String(node.skillName || '').trim());
}

async function runTriggeredPipeline({
  nodes = [],
  force = false,
  includeResources = true,
  includeJobs = true,
} = {}) {
  const startedAt = new Date().toISOString();
  const normalizedNodes = normalizeNodes(nodes);

  if (normalizedNodes.length === 0) {
    throw new Error('nodes must contain at least one item with skillName or courseName');
  }

  const skillCuration = await skillService.curateSkillsForNodes(normalizedNodes, {
    force,
    includeResources,
    includeJobs,
  });
  const hasIssues = skillCuration.items.some((item) =>
    item.status === 'failed' || item.status === 'partial'
  );

  return {
    status: hasIssues ? 'partial' : 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    summary: {
      nodesRequested: normalizedNodes.length,
      skillsProcessed: skillCuration.skillsProcessed,
      resourcesPersisted: skillCuration.resourcesPersisted,
      jobsPersisted: skillCuration.jobsPersisted,
    },
    details: {
      skillCuration,
    },
  };
}

module.exports = {
  normalizeNodes,
  runTriggeredPipeline,
};
