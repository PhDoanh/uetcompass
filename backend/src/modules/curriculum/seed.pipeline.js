const { urls } = require('./curriculum.config');
const { extractContent } = require('./tavily.service');
const { parseCourseUnits } = require('./gemini.service');
const { CourseUnit } = require('./courseUnit.model');
const { detectCycles } = require('./cycle.detector');
const { logEvent } = require('./seed.logger');
const { resolveExitStatus } = require('./seed.status');

function normalizeCourseUnit(unit, major) {
	return {
		code: `${unit.code || ''}`.trim(),
		name: `${unit.name || ''}`.trim(),
		credits: Number(unit.credits),
		major: `${unit.major || major || ''}`.trim(),
		prerequisites: Array.isArray(unit.prerequisites)
			? unit.prerequisites.map(item => `${item}`.trim()).filter(Boolean)
			: [],
		type: unit.type || null,
		suggestedSemester: unit.suggestedSemester ?? null,
		seededAt: new Date(),
	};
}

function validateCourseUnits(units) {
	if (!Array.isArray(units) || units.length === 0) {
		throw new Error('No course units parsed from source');
	}

	for (const unit of units) {
		if (!unit.code) {
			throw new Error('Course unit code is required');
		}
		if (!unit.name) {
			throw new Error('Course unit name is required');
		}
		if (!Number.isFinite(unit.credits) || unit.credits < 1) {
			throw new Error(`Course unit credits must be >= 1 for ${unit.code}`);
		}
		if (!unit.major) {
			throw new Error(`Course unit major is required for ${unit.code}`);
		}
		if (!Array.isArray(unit.prerequisites)) {
			throw new Error(`Course unit prerequisites must be an array for ${unit.code}`);
		}
	}
}

function buildBulkUpsertOps(courseUnits) {
	return courseUnits.map(unit => ({
		updateOne: {
			filter: { code: unit.code, major: unit.major },
			update: { $set: unit },
			upsert: true,
		},
	}));
}

async function upsertCourseUnits(courseUnits) {
	const operations = buildBulkUpsertOps(courseUnits);
	if (operations.length === 0) {
		return null;
	}
	return CourseUnit.bulkWrite(operations, { ordered: false });
}

function detectUnresolvedPrerequisites(courseUnits) {
	const codes = new Set(courseUnits.map(unit => unit.code));
	const unresolved = [];
	for (const unit of courseUnits) {
		for (const prerequisite of unit.prerequisites || []) {
			if (!codes.has(prerequisite)) {
				unresolved.push({ code: unit.code, prerequisite });
			}
		}
	}
	return unresolved;
}

async function runSeedPipeline() {
	const configuredUrls = Array.isArray(urls) ? urls : [];
	const summary = {
		totalUrls: configuredUrls.length,
		successCount: 0,
		failCount: 0,
		cyclesDetected: 0,
		exitStatus: null,
	};

	logEvent('info', 'JOB_START', { totalUrls: configuredUrls.length });

	if (configuredUrls.length === 0) {
		summary.exitStatus = resolveExitStatus(summary);
		logEvent('warn', 'JOB_NOOP', { reason: 'No URLs configured' });
		logEvent('info', 'JOB_COMPLETE', summary);
		return summary;
	}

	for (const item of configuredUrls) {
		const url = item?.url;
		const major = item?.major;

		logEvent('info', 'URL_START', { url, major });
		try {
			const markdown = await extractContent(url);
			const parsed = await parseCourseUnits(markdown, major);
			const normalized = parsed.map(unit => normalizeCourseUnit(unit, major));
			validateCourseUnits(normalized);
			await upsertCourseUnits(normalized);
			summary.successCount += 1;
			logEvent('info', 'URL_SUCCESS', {
				url,
				major,
				upsertedCount: normalized.length,
			});
		} catch (error) {
			summary.failCount += 1;
			const message = error?.message || 'Unknown error';
			const stage = message.includes('Tavily') || message.includes('TAVILY')
				? 'tavily'
				: message.includes('Gemini') || message.includes('JSON')
					? 'gemini'
					: message.includes('required') || message.includes('credits') || message.includes('array')
						? 'validate'
						: 'upsert';
			logEvent('error', 'URL_SKIP', {
				url,
				major,
				stage,
				reason: message,
			});
		}
	}

	const majors = await CourseUnit.distinct('major');
	for (const major of majors) {
		const majorUnits = await CourseUnit.find({ major }).lean();
		const unresolved = detectUnresolvedPrerequisites(majorUnits);
		for (const item of unresolved) {
			logEvent('warn', 'UNRESOLVED_PREREQUISITE', {
				major,
				code: item.code,
				prerequisite: item.prerequisite,
			});
		}

		const cycles = detectCycles(majorUnits);
		if (cycles.length > 0) {
			summary.cyclesDetected += cycles.length;
			logEvent('warn', 'CYCLE_DETECTED', { major, cycles });
		} else {
			logEvent('info', 'CYCLE_CLEAN', { major });
		}
	}

	summary.exitStatus = resolveExitStatus(summary);
	logEvent('info', 'JOB_COMPLETE', summary);
	return summary;
}

module.exports = {
	runSeedPipeline,
	buildBulkUpsertOps,
	upsertCourseUnits,
	validateCourseUnits,
	normalizeCourseUnit,
	detectUnresolvedPrerequisites,
};
