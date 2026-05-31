'use strict';

/* global document */

const { chromium } = require('playwright');
const {
    absolutizeUrl,
    slugify,
} = require('./adapterUtils');

const SOURCE_CODE = 'topcv';
const DEFAULT_LIMIT = 10;

function buildListingUrl(query = 'backend') {
    return `https://www.topcv.vn/tim-viec-lam-moi-nhat?keyword=${encodeURIComponent(query)}&type_keyword=1&sba=1`;
}

function buildListingUrls(query = 'backend') {
    return [
        buildListingUrl(query),
        `https://www.topcv.vn/tim-viec-lam-${slugify(query)}?keyword=${encodeURIComponent(query)}&sba=1`,
        `https://www.topcv.vn/viec-lam-it?keyword=${encodeURIComponent(query)}&type_keyword=1&sba=1`,
    ];
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
        const cards = Array.from(document.querySelectorAll('.job-item-search-result'));
        const seen = new Set();

        return cards.map((card) => {
            const link = Array.from(card.querySelectorAll('a'))
                .find((a) => a.href.includes('/viec-lam/') && a.href.includes('.html'));
            const img = card.querySelector('img');
            const lines = (card.innerText || '')
                .split('\n')
                .map(normalize)
                .filter(Boolean)
                .filter((line) => !['Xem nhanh', 'Tin moi', 'GAP'].includes(line));
            const jobUrl = link?.href || '';
            if (!jobUrl || seen.has(jobUrl)) return null;
            seen.add(jobUrl);

            const salaryText = lines.find((line) => /trieu|\$|usd|vnd|toi|thoa thuan/i.test(line)) || '';
            const city = lines.find((line) => /ha noi|ho chi minh|da nang|remote/i.test(line)) || 'Ha Noi';
            const experienceText = lines.find((line) => /kinh nghiem|nam/i.test(line)) || '';
            const title = lines[0] || normalize(link?.textContent);
            const companyName = lines[1] || img?.alt || '';
            const searchable = `${title} ${companyName} ${lines.join(' ')}`;
            const strictRoleMatch = roleRelevant(searchable);
            if (!title || (strictRoleMatch === null ? !isRelevant(searchable) : !strictRoleMatch)) return null;

            return {
                title,
                companyName,
                companyLogoUrl: img?.currentSrc || img?.src || img?.dataset?.src || '',
                city,
                location: city,
                salaryText,
                experienceText,
                jobUrl,
                applyUrl: jobUrl,
                skills: lines.slice(4, 9).filter((line) => line.length < 60),
            };
        }).filter(Boolean);
    }, { queryText: query, role: roleCode });
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
        let listingJobs = [];
        const listingUrls = options.listingUrl ? [listingUrl] : buildListingUrls(query);
        for (const url of listingUrls) {
            await listPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await listPage.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
            await listPage.waitForTimeout(5000);

            listingJobs = await collectListingJobs(listPage, query, options.role?.code);
            if (listingJobs.length > 0) break;
        }
        const jobs = listingJobs.slice(0, limit);
        totalFound = jobs.length;
        await listPage.close();

        for (const item of jobs) {
            try {
                const raw = {
                    ...item,
                    roleCode: options.role?.code,
                    roleLabel: options.role?.label,
                    crawlQuery: query,
                    sourceCode: SOURCE_CODE,
                    sourceName: 'TopCV',
                    sourceUrl: 'https://www.topcv.vn',
                    sourceJobId: slugify(item.jobUrl),
                    companyLogoUrl: absolutizeUrl(item.companyLogoUrl, 'https://www.topcv.vn'),
                };

                if (!raw.title || raw.title === 'www.topcv.vn') {
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
