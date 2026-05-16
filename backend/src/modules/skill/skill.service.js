'use strict';

const { tavily } = require('@tavily/core');
const { Skill } = require('./skill.model');

const MAX_RESOURCES_PER_SKILL = 10;

// ---------------------------------------------------------------------------
// Tavily client (lazy singleton)
// ---------------------------------------------------------------------------

let _client = null;

function getClient() {
    if (!_client) {
        if (!process.env.TAVILY_API_KEY) {
            throw new Error('Missing TAVILY_API_KEY');
        }
        _client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    }
    return _client;
}

// ---------------------------------------------------------------------------
// Type detection — maps a raw Tavily result to ResourceSchema.type
// ---------------------------------------------------------------------------

/**
 * Detect resource type from URL + title.
 * Priority: video > course > docs > project > article (fallback)
 *
 * @param {string} url
 * @param {string} title
 * @returns {'video'|'article'|'docs'|'course'|'project'}
 */
function detectResourceType(url, title) {
    const text = `${url} ${title}`.toLowerCase();

    if (
        text.includes('youtube.com') ||
        text.includes('youtu.be') ||
        text.includes('vimeo.com') ||
        /\bvideo\b/.test(text) ||
        text.includes('watch?v=')
    ) {
        return 'video';
    }

    if (
        text.includes('udemy.com') ||
        text.includes('coursera.org') ||
        text.includes('edx.org') ||
        text.includes('pluralsight.com') ||
        text.includes('linkedin.com/learning') ||
        text.includes('educative.io') ||
        text.includes('datacamp.com') ||
        text.includes('codecademy.com') ||
        text.includes('freecodecamp.org') ||
        text.includes('zerotomastery.io') ||
        /\bcourse\b/.test(text) ||
        /\bootcamp\b/.test(text)
    ) {
        return 'course';
    }

    if (
        /\/docs\//.test(text) ||
        text.includes('developer.mozilla.org') ||
        text.includes('docs.python.org') ||
        text.includes('nodejs.org/docs') ||
        text.includes('docs.microsoft.com') ||
        text.includes('learn.microsoft.com') ||
        text.includes('docs.aws.amazon.com') ||
        text.includes('cloud.google.com/docs') ||
        /\bdocumentation\b/.test(text) ||
        /\bapi reference\b/.test(text) ||
        /\bofficial doc\b/.test(text)
    ) {
        return 'docs';
    }

    if (
        text.includes('github.com') ||
        /\bproject\b/.test(text) ||
        /\bopen.?source\b/.test(text) ||
        /\brepository\b/.test(text) ||
        /\bdemo\b/.test(text) ||
        /\bsample.?app\b/.test(text)
    ) {
        return 'project';
    }

    return 'article';
}

// ---------------------------------------------------------------------------
// Crawl one skill via Tavily
// ---------------------------------------------------------------------------

/**
 * Call Tavily search for `skillName` and return normalized resources.
 *
 * @param {string} skillName
 * @returns {Promise<Array<{title: string, url: string, type: string}>>}
 */
async function crawlResourcesForSkill(skillName) {
    const client = getClient();

    const query = `learn ${skillName} tutorial course documentation`;

    let rawResults = [];
    try {
        const response = await client.search(query, {
            max_results: MAX_RESOURCES_PER_SKILL,
            include_raw_content: false,
            include_images: false,
            include_answer: false,
        });
        rawResults = Array.isArray(response?.results) ? response.results : [];
    } catch (err) {
        console.error(`[skill.service] Tavily search failed for "${skillName}":`, err.message);
        return [];
    }

    const seen = new Set();
    const resources = [];

    for (const item of rawResults) {
        const url = item?.url || '';
        const title = item?.title || skillName;

        if (!url || seen.has(url)) continue;
        seen.add(url);

        try {
            new URL(url); // validate URL
        } catch {
            continue;
        }

        resources.push({
            title: String(title).trim().slice(0, 300),
            url,
            type: detectResourceType(url, title),
        });

        if (resources.length >= MAX_RESOURCES_PER_SKILL) break;
    }

    return resources;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return resources for a skill slug.
 * Reads from Skill collection — does NOT crawl on the fly.
 *
 * @param {string} slug  lowercase skill slug (same as Skill.slug)
 * @returns {Promise<Array>}
 */
async function getResourcesBySlug(slug) {
    const skill = await Skill.findOne({ slug: slug.toLowerCase() }, { resources: 1 }).lean();
    return skill?.resources || [];
}

/**
 * Crawl and persist resources for a list of skill names.
 * Only crawls skills that have NO resources yet (idempotent for community roadmaps).
 *
 * @param {string[]} skillNames  e.g. node from roadmap.nodes[].skillName
 * @param {{ force?: boolean }} options  force=true overwrites existing resources (used on personal regen)
 * @returns {Promise<void>}
 */
async function crawlAndPersistSkills(skillNames, { force = false } = {}) {
    if (!Array.isArray(skillNames) || skillNames.length === 0) return;

    const unique = [...new Set(skillNames.filter(Boolean))];

    for (const skillName of unique) {
        const slug = skillName.toLowerCase().trim().replace(/\s+/g, '-');

        try {
            const existing = await Skill.findOne({ slug }, { resources: 1 }).lean();

            // Skip if resources already exist and we are NOT forcing a regen
            if (!force && existing?.resources?.length > 0) {
                console.log(`[skill.service] Skipping "${skillName}" — already has ${existing.resources.length} resource(s)`);
                continue;
            }

            console.log(`[skill.service] Crawling resources for "${skillName}"…`);
            const resources = await crawlResourcesForSkill(skillName);

            if (resources.length === 0) {
                console.warn(`[skill.service] No resources found for "${skillName}"`);
            }

            await Skill.findOneAndUpdate(
                { slug },
                {
                    $set: { resources, skillName },
                    $setOnInsert: { slug, description: '', metadata: {} },
                },
                { upsert: true, new: true }
            );

            console.log(`[skill.service] Persisted ${resources.length} resource(s) for "${skillName}"`);
        } catch (err) {
            // Never crash the whole pipeline for one failed skill
            console.error(`[skill.service] Failed to crawl "${skillName}":`, err.message);
        }
    }
}

/**
 * Fetch Skill.resources[] for a list of skillNames, keyed by skillName.
 * Used by Skill Tree to inject resources into nodes at serve-time.
 *
 * @param {string[]} skillNames
 * @returns {Promise<Map<string, Array>>}  skillName → resources[]
 */
async function getResourcesMap(skillNames) {
    if (!Array.isArray(skillNames) || skillNames.length === 0) return new Map();

    const slugs = skillNames.map((n) => n.toLowerCase().trim().replace(/\s+/g, '-'));

    const skills = await Skill.find(
        { slug: { $in: slugs } },
        { slug: 1, skillName: 1, resources: 1 }
    ).lean();

    const map = new Map();
    for (const skill of skills) {
        map.set(skill.skillName, skill.resources || []);
        // Also index by slug so we can look up even if skillName casing differs
        map.set(skill.slug, skill.resources || []);
    }
    return map;
}

module.exports = {
    crawlAndPersistSkills,
    getResourcesBySlug,
    getResourcesMap,
    detectResourceType,
};
