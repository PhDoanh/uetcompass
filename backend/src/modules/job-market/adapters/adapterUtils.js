'use strict';

/* global document */

function normalizeText(text = '') {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function absolutizeUrl(url, baseUrl) {
    if (!url) return '';
    try {
        return new URL(url, baseUrl).toString();
    } catch {
        return url;
    }
}

function slugify(text = '') {
    return normalizeText(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function safeText(locator, fallback = '') {
    try {
        return normalizeText(await locator.first().textContent({ timeout: 3000 }));
    } catch {
        return fallback;
    }
}

async function safeAttr(locator, attr, fallback = '') {
    try {
        return (await locator.first().getAttribute(attr, { timeout: 2000 })) || fallback;
    } catch {
        return fallback;
    }
}

async function getSection(page, headingTexts = []) {
    for (const h of headingTexts) {
        try {
            const heading = page.locator(
                `h2:text-matches("${h}", "i"), h3:text-matches("${h}", "i"), strong:text-matches("${h}", "i")`
            ).first();
            if ((await heading.count()) === 0) continue;
            const parent = heading.locator('xpath=..');
            return normalizeText(await parent.textContent({ timeout: 3000 }));
        } catch {
            // Try the next heading.
        }
    }
    return '';
}

async function findLabelValue(page, labelText) {
    try {
        const label = page.locator(`text="${labelText}"`).first();
        if ((await label.count()) === 0) return '';
        const row = label.locator('xpath=ancestor::*[2]');
        return normalizeText(await row.textContent({ timeout: 2000 }));
    } catch {
        return '';
    }
}

async function collectLinks(page, selector, predicate) {
    return page.evaluate(
        ({ selector: linkSelector, predicateSource }) => {
            const anchors = document.querySelectorAll(linkSelector);
            const seen = new Set();
            const result = [];
            const keep = predicateSource ? new Function('href', `return (${predicateSource})(href);`) : () => true;

            for (const a of anchors) {
                const href = a.href;
                if (href && !seen.has(href) && keep(href)) {
                    seen.add(href);
                    result.push(href);
                }
            }
            return result;
        },
        { selector, predicateSource: predicate ? predicate.toString() : null }
    );
}

module.exports = {
    absolutizeUrl,
    collectLinks,
    findLabelValue,
    getSection,
    normalizeText,
    safeAttr,
    safeText,
    slugify,
};
