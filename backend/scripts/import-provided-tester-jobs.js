'use strict';

/* global document */

require('dotenv').config();

const crypto = require('crypto');
const { chromium } = require('playwright');
const mongoose = require('mongoose');
const { Job } = require('../src/modules/job-market/job.model');

const ROLE_CODE = 'qa';
const ROLE_LABEL = 'Tester';

const URLS = [
    'https://www.topcv.vn/viec-lam/tester-manual-ha-noi-luong-co-ban-upto-20-trieu-tu-3-nam-kinh-nghiem/2013194.html?ta_source=JobSuggestInSearchList_LinkDetail',
    'https://www.topcv.vn/viec-lam/nhan-vien-ke-toan-kiem-toan-lam-kiem-thu-phan-mem-misa-khong-yeu-cau-kinh-nghiem-qc-tester/2170166.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/ky-su-kiem-thu-phan-mem-manual-tester-salary-700-900/2181996.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/tester-qa-qc-linh-vuc-tai-chinh/2182580.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/chuyen-vien-kiem-thu-phan-mem-tester/2165755.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/brand/sapovn/tuyen-dung/tester-domain-ai-ha-noi-thu-nhap-canh-tranh-tu-2-nam-kinh-nghiem-j2168235.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/tester-manual-automation-thu-nhap-15-20-trieu-thang/2169805.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/chuyen-vien-kiem-thu-phan-mem-tester/1713391.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/ky-su-kiem-thu-phan-mem/2169025.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
    'https://www.topcv.vn/viec-lam/qa-manual-tester-bank-finance/2164938.html?ta_source=JobSearchList_ButtonApplyFormCard&u_sr_id=QXf1VQiBgFvFYC6BS2umUjBuB9X0VIdSZl9gQmi7_1780152131',
];

function normalizeText(text = '') {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(text = '') {
    return normalizeText(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/d/g, 'd')
        .replace(/Ð/g, 'D')
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
    return ['Tester', 'QA', 'QC', 'Manual Test', 'Automation Test', 'Testing', 'Kiem thu', 'Quality Assurance', 'Bank Finance']
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
        crawlQuery: 'provided_tester_url',
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
        jobExpertise: 'Tester',
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
    await Job.deleteMany({ roleCode: ROLE_CODE, roleCodes: { $size: 1 } });

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const result = { saved: 0, mergedExisting: 0, skippedDuplicates: 0, failed: 0, errors: [] };
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
