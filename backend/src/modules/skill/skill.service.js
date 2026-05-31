'use strict';

const { tavily } = require('@tavily/core');
const { Skill } = require('./skill.model');
const { Job } = require('../job-market/job.model');

const CURATION_VERSION = 2;
const MAX_RESOURCES_PER_SKILL = readPositiveInt(process.env.SKILL_RESOURCE_MAX_RESULTS, 24);
const MAX_RESULTS_PER_QUERY = readPositiveInt(process.env.SKILL_RESOURCE_MAX_RESULTS_PER_QUERY, 5);
const MAX_RESOURCE_QUERIES_PER_SKILL = readPositiveInt(process.env.SKILL_RESOURCE_MAX_QUERIES, 8);
const MAX_COURSES_PER_SKILL = readPositiveInt(process.env.SKILL_RESOURCE_MAX_COURSES, 4);
const MAX_RELATED_JOBS_PER_SKILL = readPositiveInt(process.env.SKILL_RELATED_JOB_LIMIT, 8);
const MAX_JOB_CANDIDATES = readPositiveInt(process.env.SKILL_RELATED_JOB_CANDIDATES, 80);
const MAX_SKILLS_PER_CURATION_RUN = readPositiveInt(process.env.SKILL_CURATION_MAX_SKILLS_PER_RUN, 60);

const JOB_SEARCH_FIELDS = [
    'skills',
    'title',
    'description',
    'requirements',
    'responsibilities',
    'jobDomain',
    'jobExpertise',
    'crawlQuery',
    'roleLabel',
];

const STOP_WORDS = new Set([
    'and',
    'the',
    'for',
    'with',
    'from',
    'into',
    'basic',
    'basics',
    'introduction',
    'intro',
    'service',
    'services',
    'page',
    'pages',
    'topic',
    'skill',
]);

let _client = null;

function readPositiveInt(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getClient() {
    if (!_client) {
        if (!process.env.TAVILY_API_KEY) {
            throw new Error('Missing TAVILY_API_KEY');
        }
        _client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    }
    return _client;
}

function compactText(value = '', maxLength = 500) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function removeDiacritics(value = '') {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/\u0110/g, 'D');
}

function normalizeSkillSlug(value = '') {
    const slug = removeDiacritics(value)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return slug || 'skill';
}

function legacySkillSlug(value = '') {
    return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
}

function getSlugCandidates(value = '') {
    return [...new Set([normalizeSkillSlug(value), legacySkillSlug(value)].filter(Boolean))];
}

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasValidHttpUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function canonicalizeUrl(url) {
    if (!hasValidHttpUrl(url)) {
        return String(url || '').trim();
    }

    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
        if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) {
            parsed.searchParams.delete(key);
        }
    }
    return parsed.toString();
}

function getHostname(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

function detectPlatform(url, source = '') {
    const text = `${url} ${source}`.toLowerCase();
    if (text.includes('youtube.com') || text.includes('youtu.be')) return 'YouTube';
    if (text.includes('github.com')) return 'GitHub';
    if (text.includes('uet.vnu.edu.vn') || text.includes('uet.edu.vn')) return 'UET';
    if (text.includes('coursera.org')) return 'Coursera';
    if (text.includes('edx.org')) return 'edX';
    if (text.includes('udemy.com')) return 'Udemy';
    return getHostname(url) || compactText(source, 80) || 'Web';
}

function detectSourceType(url, title = '', source = '') {
    const hostname = getHostname(url).toLowerCase();
    const text = removeDiacritics(`${url} ${title} ${source}`).toLowerCase();

    if (hostname.includes('uet.vnu.edu.vn') || hostname.includes('uet.edu.vn')) {
        return 'uet_official';
    }

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return /\buet\b|\bvnu\b|dai hoc cong nghe|university of engineering and technology/.test(text)
            ? 'uet_youtube'
            : 'youtube';
    }

    if (hostname.includes('github.com')) {
        return 'github';
    }

    return 'external';
}

/**
 * Detect resource type from URL + title.
 *
 * @param {string} url
 * @param {string} title
 * @returns {'video'|'article'|'docs'|'course'|'project'|'slide'|'lecture_note'|'textbook'|'syllabus'|'exercise'|'lab'|'assignment'|'other'}
 */
function detectResourceType(url, title = '') {
    const text = removeDiacritics(`${url} ${title}`).toLowerCase();

    if (
        text.includes('youtube.com') ||
        text.includes('youtu.be') ||
        text.includes('watch?v=') ||
        /\b(video|playlist)\b/.test(text)
    ) {
        return 'video';
    }

    if (/\b(slide|slides|presentation|powerpoint)\b|\.pptx?\b|\.odp\b/.test(text)) {
        return 'slide';
    }

    if (/\b(giao trinh|textbook|book)\b/.test(text)) {
        return 'textbook';
    }

    if (/\b(syllabus|de cuong|course outline|course guide)\b/.test(text)) {
        return 'syllabus';
    }

    if (/\b(bai giang|lecture|lecture note|notes?|lec)\b/.test(text)) {
        return 'lecture_note';
    }

    if (/\b(bai tap|exercise|assignment|homework)\b/.test(text)) {
        return 'exercise';
    }

    if (/\b(lab|thuc hanh|practice)\b/.test(text)) {
        return 'lab';
    }

    if (
        /\b(docs?|documentation|guide|tai lieu|document)\b/.test(text) ||
        /\.pdf\b/.test(text)
    ) {
        return 'docs';
    }

    if (/\b(course|tutorial|training)\b/.test(text)) {
        return 'course';
    }

    if (text.includes('github.com') || /\b(project|repository|sample|demo)\b/.test(text)) {
        return 'project';
    }

    return 'article';
}

function resourcePriority(resource) {
    const sourcePriority = {
        uet_youtube: 0,
        uet_official: 1,
        youtube: 2,
        github: 4,
        external: 5,
        unknown: 6,
    };
    const typePriority = {
        video: 0,
        slide: 1,
        lecture_note: 2,
        textbook: 3,
        syllabus: 4,
        docs: 5,
        documentation: 5,
        lab: 6,
        exercise: 7,
        assignment: 7,
        course: 8,
        project: 9,
        article: 10,
        other: 11,
    };

    return (sourcePriority[resource.sourceType] ?? 10) * 100 + (typePriority[resource.type] ?? 20);
}

function normalizeRelatedCourse(course = {}) {
    const courseCode = compactText(course.courseCode || course.code || '', 40);
    const courseName = compactText(course.courseName || course.name || course.nameVi || course.nameEn || '', 200);
    const credits = Number(course.credits);

    if (!courseCode && !courseName) {
        return null;
    }

    return {
        courseCode,
        courseName,
        credits: Number.isFinite(credits) && credits > 0 ? credits : null,
    };
}

function dedupeCourses(courses = []) {
    const seen = new Set();
    const result = [];

    for (const course of courses) {
        const normalized = normalizeRelatedCourse(course);
        if (!normalized) continue;

        const key = `${normalized.courseCode.toLowerCase()}|${normalized.courseName.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
    }

    return result;
}

function buildResourceSearchQueries(skillName, relatedCourses = []) {
    const courses = dedupeCourses(relatedCourses).slice(0, MAX_COURSES_PER_SKILL);
    const queries = [];

    if (courses.length === 0) {
        queries.push({
            query: `${skillName} UET VNU bai giang slide giao trinh tai lieu`,
            course: null,
        });
        queries.push({
            query: `${skillName} UET YouTube giang vien bai giang`,
            course: null,
        });
    }

    for (const course of courses) {
        const subject = compactText(`${course.courseCode} ${course.courseName}`, 260);
        queries.push({
            query: `${subject} UET VNU bai giang slide giao trinh tai lieu`,
            course,
        });
        queries.push({
            query: `${subject} UET YouTube giang vien bai giang`,
            course,
        });
        queries.push({
            query: `site:uet.vnu.edu.vn ${subject} slide giao trinh tai lieu`,
            course,
        });
        queries.push({
            query: `site:uet.edu.vn ${subject} slide giao trinh tai lieu`,
            course,
        });
    }

    const seen = new Set();
    return queries
        .filter((item) => {
            const key = item.query.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, MAX_RESOURCE_QUERIES_PER_SKILL);
}

function normalizeSearchResult(item, { skillName, query, course }) {
    const rawUrl = compactText(item?.url || '', 1000);
    if (!hasValidHttpUrl(rawUrl)) {
        return null;
    }

    const title = compactText(item?.title || skillName, 300);
    const url = canonicalizeUrl(rawUrl);
    const sourceName = compactText(item?.source || getHostname(url), 100);
    const description = compactText(item?.content || item?.snippet || '', 500);
    const sourceType = detectSourceType(url, title, `${sourceName} ${query}`);
    const platform = detectPlatform(url, sourceName);

    return {
        title,
        url,
        type: detectResourceType(url, title),
        sourceType,
        sourceName,
        platform,
        description,
        courseCode: course?.courseCode || '',
        courseName: course?.courseName || '',
        crawledAt: new Date(),
        metadata: {
            skillName,
            searchQuery: query,
            score: item?.score ?? null,
        },
    };
}

/**
 * Crawl learning resources for a skill. This function only performs remote
 * searches; callers decide whether to persist the returned resources.
 */
async function crawlResourcesForSkill(skillName, { relatedCourses = [] } = {}) {
    const client = getClient();
    const queries = buildResourceSearchQueries(skillName, relatedCourses);
    const byUrl = new Map();

    for (const querySpec of queries) {
        try {
            const response = await client.search(querySpec.query, {
                max_results: MAX_RESULTS_PER_QUERY,
                include_raw_content: false,
                include_images: false,
                include_answer: false,
            });

            const results = Array.isArray(response?.results) ? response.results : [];
            for (const item of results) {
                const normalized = normalizeSearchResult(item, {
                    skillName,
                    query: querySpec.query,
                    course: querySpec.course,
                });

                if (!normalized) continue;

                const key = canonicalizeUrl(normalized.url);
                const current = byUrl.get(key);
                if (!current || resourcePriority(normalized) < resourcePriority(current)) {
                    byUrl.set(key, normalized);
                }
            }
        } catch (err) {
            console.error(`[skill.service] Tavily search failed for "${skillName}":`, err.message);
        }

        if (byUrl.size >= MAX_RESOURCES_PER_SKILL) {
            break;
        }
    }

    return [...byUrl.values()]
        .sort((a, b) => resourcePriority(a) - resourcePriority(b))
        .slice(0, MAX_RESOURCES_PER_SKILL);
}

function buildJobSearchTerms(skillName) {
    const original = compactText(skillName, 120);
    const ascii = removeDiacritics(original);
    const normalized = ascii.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
    const compact = normalized.replace(/[^a-z0-9+#]+/g, '');
    const terms = new Set();

    if (original.length >= 2) terms.add(original);
    if (ascii && ascii !== original && ascii.length >= 2) terms.add(ascii);
    if (normalized.length >= 2) terms.add(normalized);
    if (compact.length >= 2) terms.add(compact);

    normalized.split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
        .forEach((token) => terms.add(token));

    return [...terms].slice(0, 8);
}

function buildJobQuery(terms) {
    const or = [];

    for (const term of terms) {
        const regex = new RegExp(escapeRegex(term), 'i');
        for (const field of JOB_SEARCH_FIELDS) {
            or.push({ [field]: regex });
        }
    }

    return or.length > 0 ? { $or: or } : null;
}

function scoreJobRelevance(job, terms) {
    const fields = [
        job.title,
        job.companyName,
        job.roleLabel,
        job.crawlQuery,
        job.skills?.join(' '),
        job.jobDomain,
        job.jobExpertise,
        job.description,
        job.requirements,
        job.responsibilities,
    ];

    const haystack = removeDiacritics(fields.filter(Boolean).join(' ')).toLowerCase();
    const title = removeDiacritics(job.title || '').toLowerCase();
    const skills = (job.skills || []).map((skill) => removeDiacritics(skill).toLowerCase());
    const matchedTerms = [];
    let matchScore = 0;

    for (const term of terms) {
        const normalized = removeDiacritics(term).toLowerCase();
        if (!normalized) continue;

        const skillMatch = skills.some((skill) => skill === normalized || skill.includes(normalized));
        const titleMatch = title.includes(normalized);
        const textMatch = haystack.includes(normalized);

        if (skillMatch) matchScore += 55;
        if (titleMatch) matchScore += 35;
        if (textMatch) matchScore += normalized.includes(' ') ? 28 : 12;
        if (skillMatch || titleMatch || textMatch) matchedTerms.push(term);
    }

    if (job.isTargetJob) matchScore += 10;
    if (Number.isFinite(job.score)) matchScore += Math.max(0, Math.min(job.score, 80)) / 8;

    return {
        matchScore: Math.round(matchScore),
        matchedTerms: [...new Set(matchedTerms)].slice(0, 8),
    };
}

function normalizeRelatedJob(job, relevance) {
    return {
        jobId: job._id || null,
        title: compactText(job.title || 'Untitled job', 220),
        companyName: compactText(job.companyName || '', 160),
        companyLogoUrl: compactText(job.companyLogoUrl || '', 1000),
        location: compactText(job.location || job.city || '', 160),
        salaryText: compactText(job.salaryText || '', 120),
        experienceText: compactText(job.experienceText || '', 120),
        sourceCode: compactText(job.sourceCode || '', 40),
        sourceName: compactText(job.sourceName || '', 80),
        roleCodes: Array.isArray(job.roleCodes) ? job.roleCodes.filter(Boolean).slice(0, 8) : [],
        skills: Array.isArray(job.skills) ? job.skills.filter(Boolean).slice(0, 12) : [],
        score: Number.isFinite(job.score) ? job.score : 0,
        matchScore: relevance.matchScore,
        matchedTerms: relevance.matchedTerms,
        applyUrl: compactText(job.applyUrl || job.jobUrl || '', 1000),
        jobUrl: compactText(job.jobUrl || job.applyUrl || '', 1000),
        updatedAt: job.updatedAt || job.createdAt || null,
    };
}

async function findRelatedJobsForSkill(skillName, { limit = MAX_RELATED_JOBS_PER_SKILL } = {}) {
    const terms = buildJobSearchTerms(skillName);
    const query = buildJobQuery(terms);
    if (!query) {
        return [];
    }

    const candidates = await Job.find(query, {
        rawJson: 0,
        contentHash: 0,
        __v: 0,
    })
        .sort({ isTargetJob: -1, score: -1, updatedAt: -1, createdAt: -1 })
        .limit(MAX_JOB_CANDIDATES)
        .lean();

    return candidates
        .map((job) => ({
            job,
            relevance: scoreJobRelevance(job, terms),
        }))
        .filter((item) => item.relevance.matchScore > 0)
        .sort((a, b) => {
            if (b.relevance.matchScore !== a.relevance.matchScore) {
                return b.relevance.matchScore - a.relevance.matchScore;
            }
            return (b.job.score || 0) - (a.job.score || 0);
        })
        .slice(0, Math.max(1, limit))
        .map((item) => normalizeRelatedJob(item.job, item.relevance));
}

function relatedJobToResource(job) {
    return {
        title: job.title,
        url: job.applyUrl || job.jobUrl,
        type: 'job',
        sourceType: 'job_market',
        sourceName: job.sourceName || job.sourceCode || 'Job market',
        platform: job.sourceName || job.sourceCode || 'Job market',
        description: [job.companyName, job.location, job.salaryText, job.experienceText]
            .filter(Boolean)
            .join(' | '),
        metadata: {
            job,
            matchedTerms: job.matchedTerms || [],
            matchScore: job.matchScore || 0,
        },
    };
}

function getResourceKey(resource) {
    if (typeof resource === 'string') {
        return canonicalizeUrl(resource);
    }

    const url = resource?.url || resource?.link || resource?.jobUrl || resource?.applyUrl || '';
    if (url) {
        return canonicalizeUrl(url);
    }

    return `${resource?.type || 'resource'}:${resource?.title || resource?.name || ''}`.toLowerCase();
}

function mergeResourceLists(...lists) {
    const seen = new Set();
    const merged = [];

    for (const list of lists) {
        if (!Array.isArray(list)) continue;

        for (const item of list) {
            if (!item) continue;

            const key = getResourceKey(item);
            if (!key || seen.has(key)) continue;

            seen.add(key);
            merged.push(item);
        }
    }

    return merged;
}

function collectSkillInputsFromNodes(nodes = []) {
    const bySlug = new Map();

    for (const node of nodes) {
        const skillName = compactText(node?.skillName || node?.name || node?.courseName || '', 160);
        if (!skillName) continue;

        const slug = normalizeSkillSlug(skillName);
        const relatedCourses = Array.isArray(node?.relatedCourses)
            ? node.relatedCourses
            : [];

        const fallbackCourse = normalizeRelatedCourse(node || {});
        const courses = dedupeCourses([
            ...relatedCourses,
            ...(fallbackCourse ? [fallbackCourse] : []),
        ]);

        const existing = bySlug.get(slug);
        if (!existing) {
            bySlug.set(slug, {
                skillName,
                relatedCourses: courses,
            });
            continue;
        }

        existing.relatedCourses = dedupeCourses([
            ...existing.relatedCourses,
            ...courses,
        ]);
    }

    return [...bySlug.values()];
}

async function findSkillByName(skillName) {
    const slugs = getSlugCandidates(skillName);
    return Skill.findOne({
        $or: [
            { slug: { $in: slugs } },
            { skillName },
        ],
    }).lean();
}

async function crawlAndPersistSkill(input, {
    force = false,
    includeResources = true,
    includeJobs = true,
} = {}) {
    const skillName = compactText(input?.skillName || input, 160);
    if (!skillName) {
        return {
            skillName: '',
            status: 'skipped',
            resourcesPersisted: 0,
            jobsPersisted: 0,
            error: 'Missing skillName',
        };
    }

    const relatedCourses = dedupeCourses(input?.relatedCourses || []);
    const slug = normalizeSkillSlug(skillName);
    const startedAt = new Date();
    const existing = await findSkillByName(skillName);
    let resources = existing?.resources || [];
    let relatedJobs = existing?.relatedJobs || [];
    const errors = [];

    if (includeResources && (force || resources.length === 0)) {
        try {
            resources = await crawlResourcesForSkill(skillName, { relatedCourses });
        } catch (err) {
            errors.push(`resources: ${err.message}`);
            console.error(`[skill.service] Failed to crawl resources for "${skillName}":`, err.message);
        }
    }

    if (includeJobs) {
        try {
            relatedJobs = await findRelatedJobsForSkill(skillName);
        } catch (err) {
            errors.push(`jobs: ${err.message}`);
            console.error(`[skill.service] Failed to match jobs for "${skillName}":`, err.message);
        }
    }

    const finishedAt = new Date();
    const status = errors.length === 0
        ? 'success'
        : (resources.length > 0 || relatedJobs.length > 0 ? 'partial' : 'failed');

    const update = {
        $set: {
            skillName,
            resources,
            relatedJobs,
            resourceCuration: {
                status,
                version: CURATION_VERSION,
                lastStartedAt: startedAt,
                lastFinishedAt: finishedAt,
                lastError: errors.join('; '),
                resourceCount: resources.length,
                jobCount: relatedJobs.length,
            },
            'metadata.relatedCourses': relatedCourses,
            'metadata.lastCurationInputAt': finishedAt,
        },
        $setOnInsert: {
            slug,
            description: '',
        },
    };

    const filter = existing?._id ? { _id: existing._id } : { slug };
    await Skill.findOneAndUpdate(filter, update, { upsert: true, new: true });

    return {
        skillName,
        slug: existing?.slug || slug,
        status,
        resourcesPersisted: resources.length,
        jobsPersisted: relatedJobs.length,
        error: errors.join('; '),
    };
}

async function curateSkillsForNodes(nodes = [], options = {}) {
    const skillInputs = collectSkillInputsFromNodes(nodes).slice(0, MAX_SKILLS_PER_CURATION_RUN);
    const items = [];

    for (const input of skillInputs) {
        try {
            items.push(await crawlAndPersistSkill(input, options));
        } catch (err) {
            items.push({
                skillName: input.skillName,
                status: 'failed',
                resourcesPersisted: 0,
                jobsPersisted: 0,
                error: err.message,
            });
        }
    }

    return {
        skillsRequested: skillInputs.length,
        skillsProcessed: items.length,
        resourcesPersisted: items.reduce((sum, item) => sum + (item.resourcesPersisted || 0), 0),
        jobsPersisted: items.reduce((sum, item) => sum + (item.jobsPersisted || 0), 0),
        items,
    };
}

async function crawlAndPersistSkills(skillNames, options = {}) {
    if (!Array.isArray(skillNames) || skillNames.length === 0) {
        return {
            skillsRequested: 0,
            skillsProcessed: 0,
            resourcesPersisted: 0,
            jobsPersisted: 0,
            items: [],
        };
    }

    const nodes = skillNames
        .filter(Boolean)
        .map((skillName) => ({ skillName, relatedCourses: [] }));

    return curateSkillsForNodes(nodes, options);
}

async function getResourcesBySlug(slug) {
    const skill = await Skill.findOne({ slug: String(slug || '').toLowerCase() }, { resources: 1 }).lean();
    return skill?.resources || [];
}

async function getCurationMap(skillNames) {
    if (!Array.isArray(skillNames) || skillNames.length === 0) return new Map();

    const names = [...new Set(skillNames.map((name) => compactText(name, 160)).filter(Boolean))];
    const slugs = [...new Set(names.flatMap((name) => getSlugCandidates(name)))];

    const skills = await Skill.find(
        {
            $or: [
                { slug: { $in: slugs } },
                { skillName: { $in: names } },
            ],
        },
        {
            slug: 1,
            skillName: 1,
            resources: 1,
            relatedJobs: 1,
            resourceCuration: 1,
            updatedAt: 1,
        }
    ).lean();

    const map = new Map();
    for (const skill of skills) {
        const keys = [
            skill.skillName,
            String(skill.skillName || '').toLowerCase(),
            skill.slug,
            ...getSlugCandidates(skill.skillName),
        ].filter(Boolean);

        for (const key of keys) {
            map.set(key, skill);
        }
    }

    return map;
}

async function getResourcesMap(skillNames) {
    const curationMap = await getCurationMap(skillNames);
    const map = new Map();

    for (const skillName of skillNames || []) {
        const skill = curationMap.get(skillName)
            || curationMap.get(String(skillName || '').toLowerCase())
            || curationMap.get(normalizeSkillSlug(skillName));

        if (skill) {
            map.set(skillName, skill.resources || []);
            map.set(skill.slug, skill.resources || []);
        }
    }

    return map;
}

async function hydrateNodesWithSkillCuration(nodes = []) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [];
    }

    const curationMap = await getCurationMap(nodes.map((node) => node?.skillName).filter(Boolean));

    return nodes.map((node) => {
        const skillName = node?.skillName || '';
        const skill = curationMap.get(skillName)
            || curationMap.get(String(skillName).toLowerCase())
            || curationMap.get(normalizeSkillSlug(skillName));

        if (!skill) {
            return {
                ...node,
                relatedJobs: Array.isArray(node?.relatedJobs) ? node.relatedJobs : [],
            };
        }

        const relatedJobs = Array.isArray(skill.relatedJobs) ? skill.relatedJobs : [];
        const jobResources = relatedJobs.slice(0, MAX_RELATED_JOBS_PER_SKILL).map(relatedJobToResource);
        const resources = mergeResourceLists(node.resources || [], skill.resources || [], jobResources);

        return {
            ...node,
            resources,
            relatedJobs,
            skillCuration: {
                slug: skill.slug,
                status: skill.resourceCuration?.status || 'idle',
                version: skill.resourceCuration?.version || 1,
                updatedAt: skill.updatedAt || null,
            },
        };
    });
}

async function getLearningResourcesBySkill(skillName) {
    const skill = await findSkillByName(skillName);
    const resources = (skill?.resources || []).filter((resource) => resource.type !== 'job');

    return {
        skill: skillName,
        resources: {
            free: resources.map((resource) => ({
                title: resource.title,
                url: resource.url,
                platform: resource.platform || resource.sourceName || resource.sourceType,
                type: resource.type,
            })),
            paid: [],
        },
        relatedJobs: skill?.relatedJobs || [],
    };
}

module.exports = {
    crawlAndPersistSkills,
    crawlAndPersistSkill,
    crawlResourcesForSkill,
    curateSkillsForNodes,
    detectResourceType,
    findRelatedJobsForSkill,
    getCurationMap,
    getLearningResourcesBySkill,
    getResourcesBySlug,
    getResourcesMap,
    hydrateNodesWithSkillCuration,
    normalizeSkillSlug,
};
