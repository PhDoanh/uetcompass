'use strict';

const crypto = require('crypto');
const { Job, CrawlRun, CrawlJobLog } = require('./job.model');
const { getSourceMeta } = require('./jobRole.config');

const TARGET_AUDIENCE_RULES = [
    {
        code: 'intern',
        label: 'Thực tập / Intern',
        patterns: [/\bintern(ship)?\b/i, /thực\s*tập/i, /thuc\s*tap/i, /\btts\b/i],
    },
    {
        code: 'fresher',
        label: 'Fresher / Mới tốt nghiệp',
        patterns: [/\bfresher\b/i, /new\s*graduate/i, /fresh\s*graduate/i, /graduate\s*program/i, /mới\s*tốt\s*nghiệp/i, /moi\s*tot\s*nghiep/i],
    },
    {
        code: 'student',
        label: 'Sinh viên năm 3-4',
        patterns: [/sinh\s*viên/i, /sinh\s*vien/i, /năm\s*3/i, /nam\s*3/i, /năm\s*4/i, /nam\s*4/i, /\bstudent\b/i],
    },
    {
        code: 'entry',
        label: 'Entry-level',
        patterns: [/entry[\s-]*level/i, /0\s*-\s*1\s*(năm|nam|year)/i, /không\s*yêu\s*cầu\s*kinh\s*nghiệm/i, /khong\s*yeu\s*cau\s*kinh\s*nghiem/i, /chưa\s*có\s*kinh\s*nghiệm/i, /chua\s*co\s*kinh\s*nghiem/i],
    },
];

const BLOCKED_PATTERNS = [
    /\bsenior\b/i,
    /\bjunior\b/i,
    /\bmiddle\b/i,
    /\bmid[\s-]*level\b/i,
    /\blead(er)?\b/i,
    /\bmanager\b/i,
    /\bprincipal\b/i,
    /\barchitect\b/i,
    /\bhead\s+of\b/i,
    /trưởng\s*nhóm/i,
    /truong\s*nhom/i,
    /quản\s*lý/i,
    /quan\s*ly/i,
    /leader/i,
    /từ\s*2\s*năm/i,
    /tu\s*2\s*nam/i,
    /2\+?\s*(năm|nam|years?)/i,
    /[3-9]\+?\s*(năm|nam|years?)/i,
    /\b[3-9]\s*-\s*[0-9]\s*(năm|nam|years?)\b/i,
    /housekeeping/i,
    /tạp\s*vụ/i,
    /tap\s*vu/i,
    /vệ\s*sinh/i,
    /ve\s*sinh/i,
    /nhà\s*hàng/i,
    /nha\s*hang/i,
    /kế\s*toán/i,
    /ke\s*toan/i,
    /kiểm\s*toán/i,
    /kiem\s*toan/i,
    /điện\s*công\s*nghiệp/i,
    /dien\s*cong\s*nghiep/i,
    /tư\s*vấn/i,
    /tu\s*van/i,
    /chăm\s*sóc\s*khách\s*hàng/i,
    /cham\s*soc\s*khach\s*hang/i,
    /customer\s*service/i,
    /telesales/i,
    /\bsales\b/i,
    /kinh\s*doanh/i,
    /tuyển\s*sinh/i,
    /tuyen\s*sinh/i,
    /bất\s*động\s*sản/i,
    /bat\s*dong\s*san/i,
    /\bbđ\s*s\b/i,
    /\bbds\b/i,
    /marketing/i,
    /\be[\s-]*com(merce)?\b/i,
    /hải\s*quan/i,
    /hai\s*quan/i,
    /customs?\s*declaration/i,
    /xây\s*dựng/i,
    /xay\s*dung/i,
    /kỹ\s*thuật\s*điện/i,
    /ky\s*thuat\s*dien/i,
    /cố\s*vấn\s*học\s*tập/i,
    /co\s*van\s*hoc\s*tap/i,
    /khóa\s*học/i,
    /khoa\s*hoc/i,
];

const HANOI_KEYWORDS = ['ha noi', 'hanoi'];

const ROLE_RULES = {
    frontend: {
        include: [/frontend/i, /front[\s-]*end/i, /\breact\b/i, /\bvue\b/i, /\bangular\b/i, /javascript/i, /typescript/i],
        exclude: [/mobile/i, /android/i, /\bios\b/i, /flutter/i, /react\s*native/i, /\bgame\b/i, /unity/i],
    },
    backend: {
        include: [/backend/i, /back[\s-]*end/i, /node\.?js/i, /\bjava\b/i, /\bphp\b/i, /\.net/i, /golang/i, /\bgo\b/i, /python/i],
        exclude: [/frontend/i, /front[\s-]*end/i, /mobile/i, /android/i, /\bios\b/i, /\bgame\b/i, /unity/i],
    },
    fullstack: {
        include: [/full[\s-]*stack/i, /fullstack/i],
        exclude: [/mobile/i, /\bgame\b/i],
    },
    devops: {
        include: [/devops/i, /cloud/i, /\baws\b/i, /azure/i, /kubernetes/i, /\bk8s\b/i, /docker/i, /linux/i, /system\s*admin/i, /sre/i, /infrastructure/i],
        exclude: [/frontend/i, /mobile/i, /\bgame\b/i],
    },
    mobile: {
        include: [/mobile/i, /android/i, /\bios\b/i, /flutter/i, /react\s*native/i, /kotlin/i, /\bswift\b/i],
        exclude: [/web\s*developer/i, /frontend/i, /front[\s-]*end/i, /backend/i, /wordpress/i, /\bphp\b/i],
    },
    ai: {
        include: [/\bai\b/i, /artificial\s*intelligence/i, /machine\s*learning/i, /\bml\b/i, /deep\s*learning/i, /\bllm\b/i, /large\s*language\s*model/i, /ai\s*agent/i, /gen(erative)?\s*ai/i, /\bnlp\b/i, /computer\s*vision/i, /prompt/i],
        exclude: [/data\s*entry/i, /business\s*analyst/i, /web\s*developer/i, /frontend/i, /mobile/i],
    },
    'cyber-security': {
        include: [/cyber/i, /security/i, /pentest/i, /penetration/i, /\bsoc\b/i, /an\s*toàn\s*thông\s*tin/i, /an\s*ninh\s*mạng/i],
        exclude: [/security\s*guard/i, /bảo\s*vệ/i],
    },
    game: {
        include: [/\bgame\b/i, /unity/i, /unreal/i, /cocos/i, /gameplay/i],
        exclude: [/web\s*developer/i, /frontend/i, /mobile/i],
    },
    qa: {
        include: [/\bqa\b/i, /\bqc\b/i, /tester/i, /testing/i, /quality\s*assurance/i, /kiểm\s*thử/i, /kiem\s*thu/i],
        exclude: [/manager/i, /lead/i],
    },
    data: {
        include: [/data\s*analyst/i, /data\s*engineer/i, /data\s*science/i, /data\s*scientist/i, /phân\s*tích\s*dữ\s*liệu/i, /phan\s*tich\s*du\s*lieu/i],
        exclude: [/data\s*entry/i, /nhập\s*liệu/i, /nhap\s*lieu/i],
    },
    network: {
        include: [/network/i, /system\s*admin/i, /administrator/i, /quản\s*trị\s*mạng/i, /quan\s*tri\s*mang/i, /hạ\s*tầng\s*mạng/i, /ha\s*tang\s*mang/i],
        exclude: [/sales/i, /marketing/i],
    },
};

function normalizeText(text = '') {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(text = '') {
    return normalizeText(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function normalizeRoleCode(roleCode) {
    return roleCode === 'machine-learning' ? 'ai' : roleCode;
}

function buildJobText(raw = {}) {
    return [
        raw.title,
        raw.companyName,
        raw.roleLabel,
        raw.crawlQuery,
        raw.requirements,
        raw.description,
        raw.responsibilities,
        raw.experienceText,
        raw.skills?.join(' '),
        raw.jobDomain,
        raw.jobExpertise,
        raw.city,
        raw.location,
    ].filter(Boolean).join(' ');
}

function buildRoleMatchText(raw = {}) {
    return [
        raw.title,
        raw.companyName,
        raw.requirements,
        raw.description,
        raw.responsibilities,
        raw.experienceText,
        raw.skills?.join(' '),
        raw.jobDomain,
        raw.jobExpertise,
    ].filter(Boolean).join(' ');
}

function buildQualityRiskText(raw = {}) {
    return [
        raw.title,
        raw.experienceText,
        raw.skills?.join(' '),
        raw.jobDomain,
        raw.jobExpertise,
    ].filter(Boolean).join(' ');
}

function testAnyPattern(patterns, text) {
    const normalized = normalizeForMatch(text);
    return patterns.some((pattern) => pattern.test(text) || pattern.test(normalized));
}

function getTargetAudience(raw = {}) {
    const text = buildRoleMatchText(raw);
    return TARGET_AUDIENCE_RULES
        .filter((rule) => testAnyPattern(rule.patterns, text))
        .map(({ code, label }) => ({ code, label }));
}

function hasBlockedSeniority(raw = {}) {
    return testAnyPattern(BLOCKED_PATTERNS, buildQualityRiskText(raw));
}

function hasUsableCompany(raw = {}) {
    const companyName = normalizeText(raw.companyName);
    const title = normalizeText(raw.title);
    const normalizedCompany = normalizeForMatch(companyName);
    const badCompany = !companyName
        || /^(itviec\.com|topcv|topdev|joboko|dang cap nhat cong ty)$/i.test(normalizedCompany)
        || normalizedCompany === normalizeForMatch(title);
    return !badCompany;
}

function hasUsableLogo(raw = {}) {
    const logo = String(raw.companyLogoUrl || '').trim();
    if (!logo) return false;
    const normalizedLogo = normalizeForMatch(logo);
    if (/logo[-_]?default|default[-_]?logo|no[-_]?logo|placeholder/.test(normalizedLogo)) {
        return false;
    }
    try {
        const parsed = new URL(logo);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

function matchesRole(raw = {}) {
    const roleCode = normalizeRoleCode(raw.roleCode);
    const rule = ROLE_RULES[roleCode];
    if (!rule) return true;

    const text = buildRoleMatchText(raw);
    const include = testAnyPattern(rule.include, text);
    const exclude = rule.exclude?.length ? testAnyPattern(rule.exclude, text) : false;
    return include && !exclude;
}

function validateTargetJob(raw = {}) {
    const flags = [];
    const targetAudience = getTargetAudience(raw);

    if (!targetAudience.length) flags.push('missing_student_audience');
    if (hasBlockedSeniority(raw)) flags.push('blocked_seniority');
    if (!hasUsableCompany(raw)) flags.push('missing_company');
    if (!hasUsableLogo(raw)) flags.push('missing_company_logo');
    if (!matchesRole(raw)) flags.push('role_mismatch');

    return {
        isValid: flags.length === 0,
        flags,
        targetAudience,
        targetAudienceLabel: targetAudience.map((item) => item.label).join(' · '),
    };
}

function scoreJob(raw = {}) {
    const text = buildJobText(raw).toLowerCase();
    const audience = getTargetAudience(raw);
    let score = 0;

    if (audience.some((item) => item.code === 'intern')) score += 45;
    if (audience.some((item) => item.code === 'fresher')) score += 40;
    if (audience.some((item) => item.code === 'student')) score += 35;
    if (audience.some((item) => item.code === 'entry')) score += 30;
    if (matchesRole(raw)) score += 25;

    for (const kw of HANOI_KEYWORDS) {
        if (text.includes(kw)) {
            score += 20;
            break;
        }
    }

    if (hasBlockedSeniority(raw)) score -= 100;
    return score;
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, item]) => item !== undefined && item !== null)
    );
}

function buildContentHash(job) {
    const raw = JSON.stringify({
        title: job.title,
        companyName: job.companyName,
        jobUrl: job.jobUrl,
        requirements: job.requirements,
        description: job.description,
        location: job.location,
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
}

function canonicalizeJobUrl(url) {
    if (!url) return url;
    try {
        const parsed = new URL(url);
        parsed.search = '';
        parsed.hash = '';
        return parsed.toString();
    } catch {
        return url;
    }
}

async function verifyJobUrl(raw = {}) {
    const url = canonicalizeJobUrl(raw.jobUrl || raw.applyUrl);
    if (!url) return { isValid: false, reason: 'missing_url' };

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return { isValid: false, reason: 'invalid_url' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { isValid: false, reason: 'invalid_protocol' };
    }

    try {
        const response = await fetch(url, {
            redirect: 'follow',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
        });

        const finalUrl = canonicalizeJobUrl(response.url || url);
        const status = response.status;
        if (status < 200 || status >= 400) {
            return { isValid: false, reason: `http_${status}`, finalUrl };
        }

        const contentType = response.headers.get('content-type') || '';
        const body = await response.text();
        const normalizedBody = normalizeForMatch(body.slice(0, 250000));
        if (
            !contentType.includes('text/html')
            || /sorry you have been blocked|attention required|cloudflare|page not found|404 not found|khong tim thay|không tìm thấy/.test(normalizedBody)
        ) {
            return { isValid: false, reason: 'blocked_or_not_found', finalUrl };
        }

        const normalizedTitle = normalizeForMatch(raw.title);
        const normalizedCompany = normalizeForMatch(raw.companyName);
        const titleTokens = normalizedTitle.split(/\s+/).filter((token) => token.length >= 4);
        const companyTokens = normalizedCompany.split(/\s+/).filter((token) => token.length >= 4);
        const titleHits = titleTokens.filter((token) => normalizedBody.includes(token)).length;
        const companyHits = companyTokens.filter((token) => normalizedBody.includes(token)).length;
        const titleMatches = titleTokens.length === 0 || titleHits >= Math.min(2, titleTokens.length);
        const companyMatches = companyTokens.length === 0 || companyHits >= Math.min(2, companyTokens.length);

        if (!titleMatches && !companyMatches) {
            return { isValid: false, reason: 'content_mismatch', finalUrl };
        }

        return { isValid: true, finalUrl };
    } catch (err) {
        return { isValid: false, reason: `request_failed:${err.message}` };
    }
}

async function saveJob(raw) {
    const sourceMeta = getSourceMeta(raw.sourceCode);
    const link = await verifyJobUrl(raw);
    if (!link.isValid) {
        return { status: 'skipped', reason: `invalid_job_url:${link.reason}` };
    }

    const quality = validateTargetJob(raw);
    if (!quality.isValid) {
        return { status: 'skipped', reason: quality.flags.join(',') };
    }

    const job = {
        sourceCode: raw.sourceCode,
        sourceName: raw.sourceName || sourceMeta.name,
        sourceUrl: raw.sourceUrl || sourceMeta.url,
        sourceJobId: raw.sourceJobId,
        roleCode: normalizeRoleCode(raw.roleCode),
        roleLabel: raw.roleLabel,
        crawlQuery: normalizeText(raw.crawlQuery),
        title: normalizeText(raw.title),
        companyName: normalizeText(raw.companyName),
        companyLogoUrl: raw.companyLogoUrl || '',
        companyAddress: normalizeText(raw.companyAddress),
        location: normalizeText(raw.location),
        city: raw.city || 'Ha Noi',
        workingMode: normalizeText(raw.workingMode),
        experienceText: normalizeText(raw.experienceText),
        salaryText: normalizeText(raw.salaryText),
        targetAudience: quality.targetAudience.map((item) => item.code),
        targetAudienceLabel: quality.targetAudienceLabel,
        skills: Array.isArray(raw.skills) ? raw.skills.map(normalizeText).filter(Boolean) : [],
        jobDomain: normalizeText(raw.jobDomain),
        jobExpertise: normalizeText(raw.jobExpertise),
        description: normalizeText(raw.description),
        requirements: normalizeText(raw.requirements),
        responsibilities: normalizeText(raw.responsibilities),
        benefits: normalizeText(raw.benefits),
        companyInfo: normalizeText(raw.companyInfo),
        applyUrl: link.finalUrl,
        jobUrl: link.finalUrl,
        originalJobUrl: raw.originalJobUrl || canonicalizeJobUrl(raw.jobUrl),
        linkVerificationStatus: 'verified',
        linkVerifiedAt: new Date(),
        postedAt: raw.postedAt || null,
        rawJson: raw,
        qualityFlags: quality.flags,
    };

    job.score = scoreJob(job);
    job.isTargetJob = quality.isValid && job.score >= 40;
    job.contentHash = buildContentHash(job);

    const update = {
        $set: compactObject(job),
    };

    if (job.roleCode) {
        update.$addToSet = { roleCodes: job.roleCode };
    } else {
        update.$setOnInsert = { roleCodes: [] };
    }

    try {
        await Job.findOneAndUpdate(
            { jobUrl: job.jobUrl },
            update,
            { upsert: true, new: true }
        );
        return { status: 'saved' };
    } catch (err) {
        if (err.code === 11000) return { status: 'skipped' };
        throw err;
    }
}

async function listJobs({ page = 1, limit = 20, sourceCode, roleCode, isTargetOnly = false, q = '' } = {}) {
    limit = Math.min(limit, 100);
    const filter = {
        companyLogoUrl: { $exists: true, $ne: '' },
        companyName: { $exists: true, $nin: ['', 'itviec.com', 'Đang cập nhật công ty', 'Dang cap nhat cong ty'] },
        targetAudience: { $exists: true, $ne: [] },
    };

    if (isTargetOnly) filter.isTargetJob = true;
    if (sourceCode) filter.sourceCode = sourceCode;
    const normalizedRoleCode = normalizeRoleCode(roleCode);
    if (normalizedRoleCode) filter.$or = [{ roleCode: normalizedRoleCode }, { roleCodes: normalizedRoleCode }];
    else filter.roleCodes = { $exists: true, $ne: [] };
    if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const [items, total] = await Promise.all([
        Job.find(filter, {
            rawJson: 0,
            contentHash: 0,
            __v: 0,
        })
            .sort({ roleCode: 1, score: -1, updatedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Job.countDocuments(filter),
    ]);

    return { items, pagination: { page, limit, total } };
}

async function getJobById(jobId) {
    return Job.findById(jobId, { rawJson: 0, contentHash: 0, __v: 0 }).lean();
}

async function startCrawlRun(sourceCode, roleCode) {
    return CrawlRun.create({ sourceCode, roleCode: normalizeRoleCode(roleCode), status: 'running', startedAt: new Date() });
}

async function finishCrawlRun(runId, { status, totalFound, totalSaved, totalSkipped, errorMessage } = {}) {
    return CrawlRun.findByIdAndUpdate(runId, {
        status,
        finishedAt: new Date(),
        totalFound,
        totalSaved,
        totalSkipped,
        errorMessage,
    });
}

async function listCrawlRuns(sourceCode, limit = 10) {
    const filter = sourceCode ? { sourceCode } : {};
    return CrawlRun.find(filter).sort({ startedAt: -1 }).limit(limit).lean();
}

async function logJobResult(runId, sourceCode, jobUrl, status, errorMessage) {
    try {
        await CrawlJobLog.create({ runId, sourceCode, jobUrl, status, errorMessage });
    } catch {
        // Non-critical: logging should not break the crawl.
    }
}

module.exports = {
    finishCrawlRun,
    getJobById,
    listCrawlRuns,
    listJobs,
    logJobResult,
    normalizeRoleCode,
    saveJob,
    scoreJob,
    startCrawlRun,
    validateTargetJob,
    verifyJobUrl,
};
