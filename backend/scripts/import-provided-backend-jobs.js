'use strict';

/* global document */

require('dotenv').config();

const crypto = require('crypto');
const { chromium } = require('playwright');
const mongoose = require('mongoose');
const { Job } = require('../src/modules/job-market/job.model');

const ROLE_CODE = 'backend';
const ROLE_LABEL = 'Backend';

const URLS = [
    'https://www.topcv.vn/viec-lam/lap-trinh-vien-net/2164949.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780149862',
    'https://www.topcv.vn/viec-lam/junior-backend-developer-full-time-tai-ha-noi-thu-nhap-12-18-trieu/2168194.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780149862',
    'https://www.topcv.vn/brand/nganhangthuongmaicophanquandoi/tuyen-dung/junior-senior-backend-engineer-java-go-khoi-cong-nghe-thong-tin-2025td1785-j2163658.html?u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780149985&ta_source=JobSearchList_ButtonApplyFromQuickView',
    'https://www.topcv.vn/viec-lam/backend-2026/2136153.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150057',
    'https://www.topcv.vn/viec-lam/java-back-end-engineer/2144634.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150057',
    'https://www.topcv.vn/viec-lam/c-net/1301498.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150057',
    'https://www.topcv.vn/viec-lam/middle-java-backend-developer/2164636.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150168',
    'https://www.topcv.vn/viec-lam/ky-su-phat-trien-phan-mem-c-c-java-golang/2178056.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150243',
    'https://www.topcv.vn/viec-lam/php-backend-developer-wordpress-api-remote/2164259.html?u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150243&ta_source=JobSearchList_ButtonApplyFromQuickView',
    'https://www.topcv.vn/brand/elcom/tuyen-dung/java-developer-juniorspring-boot-kafka-product-j1260035.html?u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780150243&ta_source=JobSearchList_ButtonApplyFromQuickView',
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
    return ['Backend', 'Java', 'Spring Boot', 'Golang', 'Go', '.NET', 'C#', 'PHP', 'WordPress', 'API', 'Kafka', 'SQL']
        .filter((skill) => normalized.includes(normalizeForMatch(skill)));
}

async function extractTopcvJob(browser, inputUrl) {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1200 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'vi-VN',
    });
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
        crawlQuery: 'provided_backend_url',
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
        jobExpertise: 'Backend Developer',
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

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    await Job.deleteMany({ roleCodes: ROLE_CODE });

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const result = { saved: 0, skippedDuplicates: 0, failed: 0, errors: [] };
    const seen = new Set();

    try {
        for (const inputUrl of URLS) {
            const canonicalUrl = canonicalizeJobUrl(inputUrl);
            if (seen.has(canonicalUrl)) {
                result.skippedDuplicates++;
                continue;
            }
            seen.add(canonicalUrl);

            try {
                const job = await extractTopcvJob(browser, inputUrl);
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
