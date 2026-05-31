'use strict';

const { chromium } = require('playwright');
const {
    absolutizeUrl,
    collectLinks,
    findLabelValue,
    getSection,
    normalizeText,
    safeAttr,
    safeText,
    slugify,
} = require('./adapterUtils');

const SOURCE_CODE = 'itviec';
const DEFAULT_LIMIT = 10;
const DETAIL_TIMEOUT = 15000;

function buildListingUrl(query = 'backend') {
    return `https://itviec.com/it-jobs/${slugify(query)}/ha-noi`;
}

async function extractJobDetail(page, contextInfo = {}) {
    const title = await safeText(page.locator('h1'));
    const companyName = await safeText(
        page.locator('.company-name, [class*="company-name"], [class*="employer-name"]').first()
    );
    const logo = await safeAttr(
        page.locator('img[class*="logo"], img[class*="Logo"], .logo img').first(),
        'src'
    );

    const companyAddress = await findLabelValue(page, 'Dia chi cong ty') || await findLabelValue(page, 'Company address');
    const workingMode = await findLabelValue(page, 'Che do lam viec') || await findLabelValue(page, 'Working model');
    const jobExpertise = await findLabelValue(page, 'Job Expertise');
    const jobDomain = await findLabelValue(page, 'Job Domain');

    let skills = [];
    try {
        const tags = await page.locator('.tag-list .tag, [class*="skill"], [class*="tech-tag"]').allTextContents();
        skills = tags.map(normalizeText).filter((text) => text && text.length < 50);
    } catch {
        // Skills are optional.
    }

    const requirements = await getSection(page, [
        'Your skills and experience',
        'Ky nang va kinh nghiem',
        'Yeu cau ung vien',
    ]);
    const benefits = await getSection(page, ["Why you'll love working here", 'Quyen loi', 'Phuc loi']);
    const description = await getSection(page, ['Mo ta cong viec', 'Job description', 'About the job']);

    const companyInfo = await safeText(page.locator('[class*="company-info"], [class*="about-company"]').first());

    return {
        ...contextInfo,
        sourceCode: SOURCE_CODE,
        title,
        companyName,
        companyLogoUrl: absolutizeUrl(logo, page.url()),
        companyAddress,
        city: 'Ha Noi',
        location: 'Ha Noi',
        workingMode,
        jobExpertise,
        jobDomain,
        skills,
        requirements,
        benefits,
        description,
        companyInfo,
        jobUrl: page.url(),
        applyUrl: page.url(),
    };
}

async function crawl(onJob, options = {}) {
    const limit = options.limit || DEFAULT_LIMIT;
    const query = options.query || options.role?.queries?.[SOURCE_CODE] || 'backend';
    const listingUrl = options.listingUrl || buildListingUrl(query);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'vi-VN',
    });

    let totalFound;
    let totalSaved = 0;
    let totalSkipped = 0;
    const errors = [];

    try {
        const listPage = await context.newPage();
        await listPage.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await listPage.waitForTimeout(2500);

        const links = await collectLinks(
            listPage,
            'a[href*="/it-jobs/"]',
            (href) => href.includes('itviec.com/it-jobs/') && href.split('/').length > 5
        );
        const jobLinks = links.slice(0, limit);
        totalFound = jobLinks.length;
        await listPage.close();

        for (const jobUrl of jobLinks) {
            try {
                const detailPage = await context.newPage();
                await detailPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: DETAIL_TIMEOUT });
                await detailPage.waitForTimeout(1000);

                const raw = await extractJobDetail(detailPage, {
                    roleCode: options.role?.code,
                    roleLabel: options.role?.label,
                    crawlQuery: query,
                    sourceName: 'ITviec',
                    sourceUrl: 'https://itviec.com',
                    sourceJobId: slugify(jobUrl),
                });
                await detailPage.close();

                if (!raw.title || raw.title.toLowerCase().includes('itviec.com')) {
                    totalSkipped++;
                    continue;
                }

                const result = await onJob(raw);
                if (result?.status === 'skipped') totalSkipped++;
                else totalSaved++;
            } catch (err) {
                errors.push({ url: jobUrl, message: err.message });
                totalSkipped++;
            }
        }
    } finally {
        await browser.close();
    }

    return { sourceCode: SOURCE_CODE, roleCode: options.role?.code, totalFound, totalSaved, totalSkipped, errors };
}

module.exports = { crawl, SOURCE_CODE };
