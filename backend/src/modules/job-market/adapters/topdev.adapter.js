'use strict';

const { chromium } = require('playwright');
const {
    absolutizeUrl,
    collectLinks,
    getSection,
    normalizeText,
    safeAttr,
    safeText,
    slugify,
} = require('./adapterUtils');

const SOURCE_CODE = 'topdev';
const DEFAULT_LIMIT = 10;
const DETAIL_TIMEOUT = 15000;

function buildListingUrl(query = 'backend') {
    return `https://topdev.vn/viec-lam-it?sort=date&q=${encodeURIComponent(query)}&provinceIds=1`;
}

async function extractJobDetail(page, contextInfo = {}) {
    const title = await safeText(page.locator('h1'));
    const companyName = await safeText(
        page.locator('[class*="company-name"], [class*="CompanyName"], .employer-name, h2').first()
    );
    const logo = await safeAttr(
        page.locator('img[class*="logo"], img[class*="Logo"], img[alt*="logo"]').first(),
        'src'
    );

    let city = 'Ha Noi';
    let location = '';
    try {
        const chips = await page.locator('[class*="tag"], [class*="Tag"], [class*="badge"], [class*="Badge"]').allTextContents();
        const locationChip = chips.find((c) => /ha noi|hanoi|ho chi minh|hcm/i.test(c));
        if (locationChip) {
            city = normalizeText(locationChip);
            location = city;
        }
    } catch {
        // Location is optional.
    }

    const salaryText = await safeText(page.locator('[class*="salary"], [class*="Salary"]').first());
    const responsibilities = await getSection(page, ['role', 'responsibilities', 'trach nhiem', 'cong viec']);
    const requirements = await getSection(page, ['qualifications', 'requirements', 'skills', 'yeu cau', 'kinh nghiem']);
    const benefits = await getSection(page, ['benefits', 'quyen loi', 'phuc loi']);

    let skills = [];
    try {
        skills = await page.locator('[class*="skill"] span, [class*="Skill"] span, [class*="tech"] span').allTextContents();
        skills = skills.map(normalizeText).filter(Boolean);
    } catch {
        // Skills are optional.
    }

    return {
        ...contextInfo,
        sourceCode: SOURCE_CODE,
        title,
        companyName,
        companyLogoUrl: absolutizeUrl(logo, page.url()),
        city,
        location,
        salaryText,
        responsibilities,
        requirements,
        benefits,
        skills,
        jobUrl: page.url(),
        applyUrl: page.url(),
    };
}

async function crawl(onJob, options = {}) {
    const limit = options.limit || DEFAULT_LIMIT;
    const query = options.query || options.role?.queries?.[SOURCE_CODE] || 'backend';
    const listingUrl = options.listingUrl || buildListingUrl(query);
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'vi-VN',
        extraHTTPHeaders: {
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
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
            'a[href*="/viec-lam/"], a[href*="/detail-jobs/"]',
            (href) => href.includes('topdev.vn') && !href.includes('/viec-lam-it')
        );
        const jobLinks = links.slice(0, limit);
        totalFound = jobLinks.length;

        for (const jobUrl of jobLinks) {
            try {
                const detailPage = await context.newPage();
                await detailPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: DETAIL_TIMEOUT });
                await detailPage.waitForTimeout(1000);

                const raw = await extractJobDetail(detailPage, {
                    roleCode: options.role?.code,
                    roleLabel: options.role?.label,
                    crawlQuery: query,
                    sourceName: 'TopDev',
                    sourceUrl: 'https://topdev.vn',
                    sourceJobId: slugify(jobUrl),
                });
                await detailPage.close();

                if (!raw.title) {
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

        await listPage.close();
    } finally {
        await browser.close();
    }

    return { sourceCode: SOURCE_CODE, roleCode: options.role?.code, totalFound, totalSaved, totalSkipped, errors };
}

module.exports = { crawl, SOURCE_CODE };
