'use strict';

const topdevAdapter = require('./adapters/topdev.adapter');
const topcvAdapter = require('./adapters/topcv.adapter');
const itviecAdapter = require('./adapters/itviec.adapter');
const jobokoAdapter = require('./adapters/joboko.adapter');
const jobService = require('./job.service');
const { getRoles } = require('./jobRole.config');

const ADAPTERS = [itviecAdapter, jobokoAdapter, topdevAdapter, topcvAdapter];
const DEFAULT_LIMIT_PER_SOURCE = 10;

let _running = false;

function isRunning() {
    return _running;
}

function getAdapterQueries(role, sourceCode) {
    const configured = role.queries?.[sourceCode] || role.label;
    return Array.isArray(configured) ? configured.filter(Boolean) : [configured].filter(Boolean);
}

async function runCrawl({ sourceCode, roleCode, limitPerSource = DEFAULT_LIMIT_PER_SOURCE } = {}) {
    if (_running) {
        throw Object.assign(new Error('A crawl is already in progress.'), { status: 409, code: 'CRAWL_IN_PROGRESS' });
    }

    const adapters = sourceCode
        ? ADAPTERS.filter((adapter) => adapter.SOURCE_CODE === sourceCode)
        : ADAPTERS;

    if (adapters.length === 0) {
        throw Object.assign(new Error(`Unknown source: ${sourceCode}`), { status: 400, code: 'UNKNOWN_SOURCE' });
    }

    const roles = getRoles(roleCode);
    if (roles.length === 0) {
        throw Object.assign(new Error(`Unknown role: ${roleCode}`), { status: 400, code: 'UNKNOWN_ROLE' });
    }

    _running = true;
    const summary = [];

    try {
        for (const role of roles) {
            for (const adapter of adapters) {
                const run = await jobService.startCrawlRun(adapter.SOURCE_CODE, role.code);
                let status = 'success';
                let errorMessage;
                let stats = { totalFound: 0, totalSaved: 0, totalSkipped: 0 };

                try {
                    const queries = getAdapterQueries(role, adapter.SOURCE_CODE);
                    stats.errors = [];

                    for (const query of queries) {
                        const remaining = Math.max(limitPerSource - stats.totalSaved, 0);
                        if (remaining <= 0) break;

                        const queryStats = await adapter.crawl(async (raw) => {
                            const result = await jobService.saveJob(raw);
                            const logStatus = result?.status === 'skipped' ? 'skipped' : 'success';
                            await jobService.logJobResult(run._id, adapter.SOURCE_CODE, raw.jobUrl, logStatus, null);
                            return result;
                        }, { role, query, limit: remaining });

                        stats.totalFound += queryStats.totalFound || 0;
                        stats.totalSaved += queryStats.totalSaved || 0;
                        stats.totalSkipped += queryStats.totalSkipped || 0;
                        if (queryStats.errors?.length) {
                            stats.errors.push(...queryStats.errors);
                        }
                    }

                    if (stats.errors && stats.errors.length > 0) {
                        status = stats.totalSaved > 0 ? 'partial' : 'failed';
                        for (const e of stats.errors) {
                            await jobService.logJobResult(run._id, adapter.SOURCE_CODE, e.url, 'failed', e.message);
                        }
                    }
                } catch (err) {
                    status = 'failed';
                    errorMessage = err.message;
                    console.error(`[crawl:${adapter.SOURCE_CODE}:${role.code}] failed:`, err.message);
                }

                await jobService.finishCrawlRun(run._id, { status, ...stats, errorMessage });
                summary.push({ sourceCode: adapter.SOURCE_CODE, roleCode: role.code, status, ...stats });
            }
        }
    } finally {
        _running = false;
    }

    return summary;
}

module.exports = { runCrawl, isRunning };
