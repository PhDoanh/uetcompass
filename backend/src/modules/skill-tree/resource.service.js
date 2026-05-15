'use strict';

const skillService = require('../skill/skill.service');
const { Roadmap } = require('../roadmap/roadmap.model');

/**
 * Resolve all skillNames attached to nodes that contain `courseCode`
 * in their relatedCourses array.
 *
 * @param {string} courseCode
 * @returns {Promise<string[]>}
 */
async function resolveSkillNamesForCourse(courseCode) {
    const roadmap = await Roadmap.findOne(
        { isPrimary: true, 'nodes.relatedCourses.courseCode': courseCode },
        { 'nodes.$': 1 }
    ).lean();

    if (!roadmap || !Array.isArray(roadmap.nodes)) return [];

    return roadmap.nodes
        .map((n) => n.skillName)
        .filter(Boolean);
}

/**
 * GET /skill-tree/nodes/:courseCode/resources
 *
 * Returns curated resources for all skills linked to this course code.
 *
 * @param {string} courseCode
 * @returns {Promise<Array<{title: string, url: string, type: string}>>}
 */
async function getResourcesByCourse(courseCode) {
    const skillNames = await resolveSkillNamesForCourse(courseCode);
    if (skillNames.length === 0) return [];

    const resourcesMap = await skillService.getResourcesMap(skillNames);

    const seen = new Set();
    const merged = [];

    for (const skillName of skillNames) {
        const resources = resourcesMap.get(skillName) || [];
        for (const r of resources) {
            if (!seen.has(r.url)) {
                seen.add(r.url);
                merged.push(r);
            }
        }
    }

    return merged;
}

/**
 * GET /skill-tree/skills/:skillName/learning-resources
 *
 * Returns curated resources for a specific skill.
 *
 * @param {string} skillName
 * @returns {Promise<{skill: string, resources: Array}>}
 */
async function getResourcesBySkill(skillName) {
    const slug = skillName.toLowerCase().trim().replace(/\s+/g, '-');
    const resources = await skillService.getResourcesBySlug(slug);
    return { skill: skillName, resources };
}

module.exports = { getResourcesByCourse, getResourcesBySkill };
