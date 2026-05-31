'use strict';

/* global document */

require('dotenv').config();

const crypto = require('crypto');
const { chromium } = require('playwright');
const mongoose = require('mongoose');
const { Job } = require('../src/modules/job-market/job.model');

const ROLE_CODE = 'data';
const ROLE_LABEL = 'Data';
const EXTRA_DATA_URLS = [
    'https://www.topcv.vn/brand/vpbank/tuyen-dung/junior-data-scientist-ta192-j2179754.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780190019',
    'https://www.topcv.vn/viec-lam/chuyen-vien-khoa-hoc-du-lieu-data-scientist/2090430.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780190019',
];

const URLS = [
    'https://www.topcv.vn/viec-lam/data-analyst-business-data-analyst/2166282.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152291',
    'https://www.topcv.vn/viec-lam/intern-data-analyst-tro-cap-3m-5m-thang/2176140.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152338',
    'https://www.topcv.vn/viec-lam/data-analyst-tu-2-nam-kinh-nghiem-thu-nhap-hap-dan-lam-viec-tai-ha-noi/2171572.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152338',
    'https://www.topcv.vn/brand/kamereo/tuyen-dung/data-analyst-j2172546.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152338',
    'https://www.topcv.vn/viec-lam/data-analyst/2180185.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152338',
    'https://www.topcv.vn/viec-lam/data-solution-consultant/2178775.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152380',
    'https://www.topcv.vn/viec-lam/middle-data-engineer-tu-3-nam-kinh-nghiem/2177866.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152380',
    'https://www.topcv.vn/viec-lam/data-engineer/2161616.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152380',
    'https://www.topcv.vn/viec-lam/data-engineer/2163876.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152380',
    'https://www.topcv.vn/viec-lam/data-engineer/2161616.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152380',
    ...EXTRA_DATA_URLS,
];

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

function canonicalizeJobUrl(url) {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
}

function contentHash(job) {
    return crypto.createHash('sha256').update(JSON.stringify({
        title: job.title,
        companyName: job.companyName,
        jobUrl: job.jobUrl,
    })).digest('hex');
}

function extractByHeading(lines, heading, stopHeadings) {
    const start = lines.findIndex((line) => normalizeForMatch(line) === normalizeForMatch(heading));
    if (start < 0) return '';
    const collected = [];
    for (let i = start + 1; i < lines.length; i++) {
        const normalized = normalizeForMatch(lines[i]);
        if (stopHeadings.some((item) => normalized === normalizeForMatch(item))) break;
        collected.push(lines[i]);
    }
    return normalizeText(collected.join(' '));
}

function findLineAfter(lines, label, fallback = '') {
    const index = lines.findIndex((line) => normalizeForMatch(line) === normalizeForMatch(label));
    return index >= 0 ? lines[index + 1] || fallback : fallback;
}

function extractCompanyFromPageTitle(pageTitle) {
    const rawTitle = normalizeText(pageTitle);
    const normalizedTitle = normalizeForMatch(rawTitle);
    const marker = 'lam viec tai ';
    const markerIndex = normalizedTitle.lastIndexOf(marker);
    if (markerIndex < 0) return '';
    return normalizeText(rawTitle.slice(markerIndex + marker.length).replace(/\s+-\s+TopCV.*$/i, ''));
}

function extractJobTitleFromPageTitle(pageTitle) {
    const rawTitle = normalizeText(pageTitle);
    const normalizedTitle = normalizeForMatch(rawTitle);
    const prefix = 'tuyen ';
    const marker = ' lam viec tai ';
    const startIndex = normalizedTitle.startsWith(prefix) ? prefix.length : 0;
    const markerIndex = normalizedTitle.lastIndexOf(marker);
    if (markerIndex <= startIndex) return '';
    return normalizeText(rawTitle.slice(startIndex, markerIndex));
}

function inferSkills(text) {
    const normalized = normalizeForMatch(text);
    return ['Data', 'Data Analyst', 'Business Data Analyst', 'Data Engineer', 'SQL', 'Python', 'Power BI', 'Tableau', 'ETL', 'Big Data']
        .filter((skill) => normalized.includes(normalizeForMatch(skill)));
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createBrowserContext(browser) {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
    });
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    return context;
}

async function extractTopcvJob(browser, inputUrl) {
    const context = await createBrowserContext(browser);
    const page = await context.newPage();
    const canonicalInputUrl = canonicalizeJobUrl(inputUrl);
    let response;
    let data;

    try {
        response = await page.goto(inputUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);

        data = await page.evaluate(() => {
            const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();
            const images = Array.from(document.images).map((img) => ({
                src: img.currentSrc || img.src || img.dataset.src || '',
                alt: img.alt || '',
                width: img.naturalWidth || 0,
                height: img.naturalHeight || 0,
            }));

            return {
                pageTitle: document.title,
                finalUrl: location.href,
                title: normalize(document.querySelector('h1')?.innerText || ''),
                body: document.body.innerText || '',
                images,
            };
        });
    } finally {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
    }

    const normalizedBody = normalizeForMatch(data.body);
    const httpStatus = response?.status() || 0;
    const invalidPagePattern = /sorry you have been blocked|attention required|cloudflare|khong tim thay|khong ton tai|tin tuyen dung khong ton tai|viec lam khong ton tai/;
    const jobTitle = extractJobTitleFromPageTitle(data.pageTitle) || data.title;
    if (!jobTitle || httpStatus >= 400 || invalidPagePattern.test(normalizedBody)) {
        throw new Error(`URL is not a valid job detail page: ${canonicalInputUrl}`);
    }

    const companyName = extractCompanyFromPageTitle(data.pageTitle);
    if (!companyName) {
        throw new Error(`Cannot extract company name: ${canonicalInputUrl}`);
    }

    const normalizedCompanyName = normalizeForMatch(companyName);
    const logoCandidates = data.images.filter((image) => image.src.includes('company_logos') && normalizeText(image.alt));
    const logo = logoCandidates.find((image) => {
        const alt = normalizeForMatch(image.alt);
        return alt === normalizedCompanyName
            || alt.includes(normalizedCompanyName.slice(0, Math.min(normalizedCompanyName.length, 24)))
            || normalizedCompanyName.includes(alt.slice(0, Math.min(alt.length, 24)));
    }) || logoCandidates[0];

    if (!logo?.src) {
        throw new Error(`Cannot extract company logo/company name: ${canonicalInputUrl}`);
    }

    const titleWords = normalizeForMatch(jobTitle).split(' ').filter(Boolean).slice(0, 3).join(' ');
    if (titleWords && !normalizedBody.includes(titleWords)) {
        throw new Error(`Content does not match title: ${canonicalInputUrl}`);
    }

    const lines = data.body.split('\n').map(normalizeText).filter(Boolean);
    const stopHeadings = [
        'yeu cau ung vien',
        'quyen loi',
        'dia diem lam viec',
        'cach thuc ung tuyen',
        'viec lam lien quan',
        'thong tin chung',
    ];

    const description = extractByHeading(lines, 'mo ta cong viec', stopHeadings);
    const requirements = extractByHeading(lines, 'yeu cau ung vien', stopHeadings);
    const benefits = extractByHeading(lines, 'quyen loi', stopHeadings);
    const salaryText = findLineAfter(lines, 'muc luong', 'Thoa thuan');
    const location = findLineAfter(lines, 'dia diem', 'Ha Noi');
    const experienceText = findLineAfter(lines, 'kinh nghiem', '');

    return {
        sourceCode: 'topcv',
        sourceName: 'TopCV',
        sourceUrl: 'https://www.topcv.vn',
        sourceJobId: canonicalInputUrl.match(/(?:\/|-)j?(\d+)\.html/)?.[1] || canonicalInputUrl,
        roleCode: ROLE_CODE,
        roleLabel: ROLE_LABEL,
        roleCodes: [ROLE_CODE],
        crawlQuery: 'provided_data_url',
        title: jobTitle,
        companyName,
        companyLogoUrl: logo.src,
        location,
        city: normalizeForMatch(location).includes('ho chi minh') ? 'Ho Chi Minh' : 'Ha Noi',
        experienceText,
        salaryText,
        targetAudience: ['provided'],
        targetAudienceLabel: 'URL duoc cung cap',
        skills: inferSkills(data.body),
        jobDomain: 'IT - Phan mem',
        jobExpertise: 'Data',
        description,
        requirements,
        benefits,
        applyUrl: canonicalInputUrl,
        jobUrl: canonicalInputUrl,
        originalJobUrl: canonicalInputUrl,
        linkVerificationStatus: 'verified',
        linkVerifiedAt: new Date(),
        isTargetJob: true,
        score: 100,
        rawJson: { inputUrl, pageTitle: data.pageTitle, finalUrl: data.finalUrl },
    };
}

async function extractTopcvJobWithRetry(browser, inputUrl, maxAttempts = 5) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await extractTopcvJob(browser, inputUrl);
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts) {
                await sleep(5000 + attempt * 3500);
            }
        }
    }
    throw lastError;
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    if (!process.argv.includes('--only-extra')) {
        await Job.deleteMany({ roleCode: ROLE_CODE, roleCodes: { $size: 1 } });
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const result = { saved: 0, mergedExisting: 0, skippedDuplicates: 0, failed: 0, errors: [] };
    const seen = new Set();
    const urlsToCrawl = process.argv.includes('--only-extra') ? EXTRA_DATA_URLS : URLS;

    try {
        for (const inputUrl of urlsToCrawl) {
            const canonicalUrl = canonicalizeJobUrl(inputUrl);
            if (seen.has(canonicalUrl)) {
                result.skippedDuplicates++;
                continue;
            }
            seen.add(canonicalUrl);

            try {
                const job = await extractTopcvJobWithRetry(browser, inputUrl);
                const existing = await Job.findOne({ jobUrl: job.jobUrl }, { roleCodes: 1 }).lean();
                if (existing) {
                    job.roleCodes = Array.from(new Set([...(existing.roleCodes || []), ROLE_CODE]));
                    result.mergedExisting++;
                }
                job.contentHash = contentHash(job);
                await Job.findOneAndUpdate(
                    { jobUrl: job.jobUrl },
                    { $set: job },
                    { upsert: true, new: true }
                );
                result.saved++;
            } catch (err) {
                result.failed++;
                result.errors.push({ url: canonicalUrl, message: err.message });
            }
        }
    } finally {
        await browser.close();
        await mongoose.disconnect();
    }

    console.log(JSON.stringify(result, null, 2));
}

main().catch(async (err) => {
    console.error(err);
    try {
        await mongoose.disconnect();
    } catch {
        // Ignore disconnect failure on fatal import errors.
    }
    process.exitCode = 1;
});
