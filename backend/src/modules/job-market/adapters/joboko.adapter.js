'use strict';

/* global document */

const { chromium } = require('playwright');
const {
    absolutizeUrl,
    getSection,
    normalizeText,
    safeAttr,
    safeText,
    slugify,
} = require('./adapterUtils');

const SOURCE_CODE = 'joboko';
const DEFAULT_LIMIT = 10;
const DETAIL_TIMEOUT = 15000;

function buildListingUrl(query = 'backend') {
    return `https://vn.joboko.com/tim-viec-lam?keyword=${encodeURIComponent(query)}&ind=124`;
}

async function collectListingJobs(page, query, roleCode) {
    return page.evaluate(({ queryText, role }) => {
        const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();
        const searchableText = (text) => normalize(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const roleRelevant = (text) => {
            const value = searchableText(text);
            if (role === 'data') {
                return [
                    'data analyst',
                    'data engineer',
                    'data scientist',
                    'data science',
                    'business analyst',
                    'phan tich du lieu',
                    'ky su du lieu',
                    'khoa hoc du lieu',
                ].some((keyword) => value.includes(keyword));
            }
            if (role === 'network') {
                return [
                    'network engineer',
                    'network administrator',
                    'network admin',
                    'quan tri mang',
                    'ky su mang',
                    'ha tang mang',
                ].some((keyword) => value.includes(keyword));
            }
            return null;
        };
        const tokens = normalize(queryText).toLowerCase().split(/\s+/).filter((token) => token.length >= 2);
        const isRelevant = (text) => tokens.length === 0 || tokens.some((token) => text.toLowerCase().includes(token));
        const cards = Array.from(document.querySelectorAll('.item'));
        const seen = new Set();

        return cards.map((card) => {
            const link = Array.from(card.querySelectorAll('a'))
                .find((a) => a.href.includes('/viec-lam-') && a.href.includes('xvi'));
            const jobUrl = link?.href || '';
            if (!jobUrl || seen.has(jobUrl)) return null;
            seen.add(jobUrl);

            const lines = (card.innerText || '').split('\n').map(normalize).filter(Boolean);
            const title = normalize(link?.innerText || lines[0]).replace(/^HOT/i, '');
            const companyName = lines.find((line) => /cong ty|công ty|tnhh|co phan|cổ phần/i.test(line)) || lines[1] || '';
            const salaryText = lines.find((line) => /trieu|triệu|vnd|\$|thoa|thoả|luong|lương/i.test(line)) || '';
            const city = lines.find((line) => /ha noi|hà nội|ho chi minh|hồ chí minh|da nang|đà nẵng/i.test(line)) || '';
            const img = card.querySelector('img');
            const searchable = `${title} ${companyName} ${lines.join(' ')}`;
            const strictRoleMatch = roleRelevant(searchable);
            if (!title || (strictRoleMatch === null ? !isRelevant(searchable) : !strictRoleMatch)) return null;

            return {
                title,
                companyName,
                companyLogoUrl: img?.currentSrc || img?.src || img?.dataset?.src || '',
                city: city || 'Ha Noi',
                location: city || 'Ha Noi',
                salaryText,
                jobUrl,
                applyUrl: jobUrl,
                skills: [],
            };
        }).filter(Boolean);
    }, { queryText: query, role: roleCode });
}

function isRelevantToQuery(raw, query) {
    const tokens = normalizeText(query).toLowerCase().split(/\s+/).filter((token) => token.length >= 2);
    if (tokens.length === 0) return true;

    const haystack = [
        raw.title,
        raw.companyName,
        raw.description,
        raw.requirements,
        raw.skills?.join(' '),
    ].filter(Boolean).join(' ').toLowerCase();

    return tokens.some((token) => haystack.includes(token));
}

async function extractJobDetail(page, item, contextInfo = {}) {
    const title = await safeText(page.locator('h1'), item.title);
    const logoLocator = page.locator('img[src*="ComLogo"], img[data-src*="ComLogo"]').first();
    const logo = await safeAttr(logoLocator, 'src')
        || await safeAttr(logoLocator, 'data-src')
        || item.companyLogoUrl;
    const logoAlt = await safeAttr(logoLocator, 'alt');
    const description = await getSection(page, ['Mô tả công việc', 'Job description', 'Mô tả']);
    const requirements = await getSection(page, ['Yêu cầu', 'Yêu cầu công việc', 'Yêu cầu ứng viên']);
    const benefits = await getSection(page, ['Quyền lợi', 'Phúc lợi']);

    return {
        ...item,
        ...contextInfo,
        title,
        companyName: logoAlt || item.companyName,
        companyLogoUrl: absolutizeUrl(logo, page.url()),
        description,
        requirements,
        benefits,
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
        await listPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await listPage.waitForTimeout(3000);

        const listingJobs = await collectListingJobs(listPage, query, options.role?.code);
        const jobs = listingJobs.slice(0, limit);
        totalFound = jobs.length;
        await listPage.close();

        for (const item of jobs) {
            try {
                const detailPage = await context.newPage();
                await detailPage.goto(item.jobUrl, { waitUntil: 'domcontentloaded', timeout: DETAIL_TIMEOUT });
                await detailPage.waitForTimeout(1000);

                const raw = {
                    ...(await extractJobDetail(detailPage, item, {
                        roleCode: options.role?.code,
                        roleLabel: options.role?.label,
                        crawlQuery: query,
                        sourceCode: SOURCE_CODE,
                        sourceName: 'JobOKO',
                        sourceUrl: 'https://vn.joboko.com',
                        sourceJobId: slugify(item.jobUrl),
                    })),
                };
                await detailPage.close();

                if (!raw.title || !isRelevantToQuery(raw, query)) {
                    totalSkipped++;
                    continue;
                }

                const result = await onJob(raw);
                if (result?.status === 'skipped') totalSkipped++;
                else totalSaved++;
            } catch (err) {
                errors.push({ url: item.jobUrl, message: err.message });
                totalSkipped++;
            }
        }
    } finally {
        await browser.close();
    }

    return { sourceCode: SOURCE_CODE, roleCode: options.role?.code, totalFound, totalSaved, totalSkipped, errors };
}

module.exports = { crawl, SOURCE_CODE };
