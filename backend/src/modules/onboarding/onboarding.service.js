const { Types } = require('mongoose');
const { StudentProfile } = require('./onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');
const { Program } = require('../curriculum/program.model');
const {
	normalizeOptionalValue,
	validateDateValue,
	validateDropdownValue,
} = require('./onboarding.validation');
const { ERROR_CODES, OnboardingError } = require('./onboarding.errors');
const { notifyUser } = require('./onboarding.sse');
const { sendRoadmapReadyEmail, sendRoadmapFailedEmail } = require('./onboarding.email');

let roadmapGenerationHandler = async () => ({ status: 'completed' });

async function resolveMaybeLean(queryLike) {
	if (queryLike && typeof queryLike.lean === 'function') {
		return queryLike.lean();
	}
	return queryLike;
}

function setRoadmapGenerationHandler(handler) {
	roadmapGenerationHandler = handler;
}

async function dispatchNotifications(userId, status) {
	notifyUser(String(userId), 'roadmap:status', status === 'completed' ? { status } : { status, retryable: true });

	const profile = await resolveMaybeLean(StudentProfile.findOne({ userId }));
	const recipient = profile?.email || profile?.userEmail || null;
	const displayName = profile?.displayName || 'student';
	if (!recipient) {
		return;
	}

	if (status === 'completed') {
		await sendRoadmapReadyEmail(recipient, displayName);
	} else {
		await sendRoadmapFailedEmail(recipient, displayName);
	}
}

function validateField(fieldName, value, options = null) {
	const result = fieldName === 'careerGoal.role'
		? validateDropdownValue(value, options)
		: validateDateValue(value);
	if (!result.valid) {
		throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, `${fieldName}: ${result.reason}`, {
			field: fieldName,
		});
	}
}

function normalizeRoleOptions(careerTracks) {
	if (!Array.isArray(careerTracks)) {
		return [];
	}

	const unique = new Set();
	for (const item of careerTracks) {
		const normalized = normalizeOptionalValue(item);
		if (normalized) {
			unique.add(normalized);
		}
	}

	return [...unique];
}

async function resolveProgramByMajorName(majorName) {
	const normalizedMajor = normalizeOptionalValue(majorName);
	if (!normalizedMajor) {
		return null;
	}

	return resolveMaybeLean(
		Program.findOne(
			{ nameEN: normalizedMajor },
			{ _id: 0, programId: 1, nameEN: 1, careerTracks: 1 }
		)
	);
}

async function resolveProgramByProgramId(programId) {
	const normalizedProgramId = normalizeOptionalValue(programId);
	if (!normalizedProgramId) {
		return null;
	}

	return resolveMaybeLean(
		Program.findOne(
			{ programId: normalizedProgramId },
			{ _id: 0, programId: 1, nameEN: 1, careerTracks: 1 }
		)
	);
}

async function getElectiveCourseCodesByProgramId(programId) {
	if (!programId) {
		return new Set();
	}

	const rows = await resolveMaybeLean(CourseUnit.find(
		{ programId, type: 'elective' },
		{ _id: 0, code: 1 }
	));

	return new Set(rows.map((row) => String(row.code || '').trim()).filter(Boolean));
}

function canonicalizeCompletedCourses(completedCourses = [], selectedMajor = null, electiveCourseCodes = null) {
	if (!Array.isArray(completedCourses)) {
		throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'completedCourses must be an array', {
			field: 'completedCourses',
		});
	}

	if (!selectedMajor) {
		return [];
	}

	const byIdentity = new Map();

	for (const item of completedCourses) {
		if (!item || !item.courseCode) {
			continue;
		}

		const major = normalizeOptionalValue(item.major);
		const courseCode = String(item.courseCode).trim();
		if (!major || !courseCode || major !== selectedMajor) {
			continue;
		}

		if (electiveCourseCodes instanceof Set && !electiveCourseCodes.has(courseCode)) {
			continue;
		}

		const key = `${major}::${courseCode}`;
		const canonical = { major, courseCode };

		if (item.courseUnitId && Types.ObjectId.isValid(item.courseUnitId)) {
			canonical.courseUnitId = item.courseUnitId;
		}

		byIdentity.set(key, canonical);
	}

	return [...byIdentity.values()];
}

async function normalizePayload(payload = {}) {
	const careerGoal = payload.careerGoal || {};
	validateField('careerGoal.graduationTimeline', careerGoal.graduationTimeline);

	const hasProgramId = Object.prototype.hasOwnProperty.call(payload, 'programId');
	const normalizedProgramId = hasProgramId ? normalizeOptionalValue(payload.programId) : null;
	const hasMajor = Object.prototype.hasOwnProperty.call(payload, 'major');
	const normalizedMajor = hasMajor ? normalizeOptionalValue(payload.major) : null;

	let resolvedProgram = null;
	if (normalizedProgramId) {
		resolvedProgram = await resolveProgramByProgramId(normalizedProgramId);
		if (!resolvedProgram) {
			throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'programId: Invalid major selection', {
				field: 'programId',
			});
		}

		if (normalizedMajor && resolvedProgram.nameEN !== normalizedMajor) {
			throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'major: Mismatch between major and programId', {
				field: 'major',
			});
		}
	} else if (normalizedMajor) {
		resolvedProgram = await resolveProgramByMajorName(normalizedMajor);
		if (!resolvedProgram) {
			throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'major: Invalid major selection', {
				field: 'major',
			});
		}
	}

	const resolvedMajor = resolvedProgram?.nameEN || normalizedMajor || null;
	const resolvedProgramId = resolvedProgram?.programId || normalizedProgramId || null;

	const normalizedRole = normalizeOptionalValue(careerGoal.role);
	if (normalizedRole && !resolvedMajor) {
		throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'careerGoal.role: Selected major is required', {
			field: 'careerGoal.role',
		});
	}

	if (normalizedRole && resolvedProgram) {
		const roleOptions = normalizeRoleOptions(resolvedProgram.careerTracks);
		validateField('careerGoal.role', normalizedRole, roleOptions);
	}

	const canNormalizeCourses = Object.prototype.hasOwnProperty.call(payload, 'completedCourses');
	let canonicalCourses;
	if (canNormalizeCourses) {
		if (!resolvedMajor) {
			throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'completedCourses require a selected major', {
				field: 'completedCourses',
			});
		}

		const electiveCodes = await getElectiveCourseCodesByProgramId(resolvedProgramId);
		canonicalCourses = canonicalizeCompletedCourses(payload.completedCourses, resolvedMajor, electiveCodes);
	}

	const hasMajorSelectionField = hasMajor || hasProgramId;

	return {
		...(hasMajorSelectionField
			? {
				programId: resolvedProgramId,
				major: resolvedMajor,
			}
			: {}),
		...(canNormalizeCourses
			? { completedCourses: canonicalCourses }
			: {}),
		...(Object.prototype.hasOwnProperty.call(payload, 'careerGoal')
			? {
				careerGoal: {
					role: normalizeOptionalValue(careerGoal.role),
					graduationTimeline: normalizeOptionalValue(careerGoal.graduationTimeline),
				},
			}
			: {}),
	};
}

function isGenericProfile(payload) {
	const completedCourses = payload.completedCourses || [];
	const careerGoal = payload.careerGoal || {};
	const hasRole = !!normalizeOptionalValue(careerGoal.role);
	const hasTimeline = !!normalizeOptionalValue(careerGoal.graduationTimeline);
	return completedCourses.length === 0 && !hasRole && !hasTimeline;
}

async function assertDraftWritable(userId) {
	const existing = await resolveMaybeLean(StudentProfile.findOne({ userId }));
	if (existing && existing.isDraft === false) {
		throw new OnboardingError(
			403,
			ERROR_CODES.ONBOARDING_ALREADY_COMPLETED,
			'Onboarding is complete. Use the profile settings page to make changes.',
			{ isDraft: false }
		);
	}
}

async function getDraft(userId) {
	return resolveMaybeLean(StudentProfile.findOne({ userId }));
}

async function getCourseCatalog() {
	const programs = await Program.find(
		{},
		{
			_id: 0,
			programId: 1,
			nameEN: 1,
			careerTracks: 1,
		}
	)
		.sort({ nameEN: 1 })
		.lean();

	const majors = [];
	const roleOptionsByProgramId = {};
	const requiredCourseLinks = {};
	const programById = new Map();

	for (const program of programs) {
		const majorName = normalizeOptionalValue(program.nameEN);
		const programId = normalizeOptionalValue(program.programId);
		if (!majorName || !programId) {
			continue;
		}

		majors.push({
			programId,
			nameEN: majorName,
		});
		roleOptionsByProgramId[programId] = normalizeRoleOptions(program.careerTracks);
		programById.set(programId, majorName);
	}

	const programIds = [...programById.keys()];
	const linkRows = await CourseUnit.find(
		{ programId: { $in: programIds } },
		{
			_id: 0,
			programId: 1,
			source: 1,
		}
	)
		.sort({ programId: 1, code: 1 })
		.lean();

	const requiredLinkByProgramId = new Map();
	for (const row of linkRows) {
		const programId = normalizeOptionalValue(row.programId);
		const url = normalizeOptionalValue(row?.source?.url);
		if (!programId || !url || requiredLinkByProgramId.has(programId)) {
			continue;
		}
		requiredLinkByProgramId.set(programId, url);
	}

	for (const [programId, majorName] of programById.entries()) {
		requiredCourseLinks[programId] = requiredLinkByProgramId.get(programId) || null;
	}

	const rows = await CourseUnit.find(
		{ programId: { $in: programIds }, type: 'elective' },
		{
			_id: 1,
			programId: 1,
			code: 1,
			name: 1,
		}
	)
		.sort({ programId: 1, code: 1 })
		.lean();

	const catalogByProgramId = new Map();

	for (const row of rows) {
		const programId = normalizeOptionalValue(row.programId);
		const courseCode = String(row.code || '').trim();
		const name = String(row.name || '').trim();
		if (!programById.has(programId) || !courseCode || !name) {
			continue;
		}

		if (!catalogByProgramId.has(programId)) {
			catalogByProgramId.set(programId, new Map());
		}

		const byCode = catalogByProgramId.get(programId);
		if (!byCode.has(courseCode)) {
			byCode.set(courseCode, {
				courseCode,
				name,
				courseUnitId: String(row._id),
			});
		}
	}

	const courseCatalog = Object.fromEntries(
		majors.map((major) => {
			const courses = [...(catalogByProgramId.get(major.programId)?.values() || [])].sort((a, b) =>
				a.courseCode.localeCompare(b.courseCode, 'en')
			);
			return [major.programId, courses];
		})
	);

	return {
		majors,
		courseCatalog,
		roleOptionsByProgramId,
		requiredCourseLinks,
	};
}

async function upsertDraft(userId, payload) {
	console.info('[onboarding:draft:upsert:start]', { userId: String(userId) });
	await assertDraftWritable(userId);

	const normalized = await normalizePayload(payload);
	const now = new Date();

	try {
		const result = await StudentProfile.findOneAndUpdate(
			{ userId },
			{
				$set: {
					...normalized,
					updatedAt: now,
				},
				$setOnInsert: {
					userId,
					isDraft: true,
					createdAt: now,
					submittedAt: null,
				},
			},
			{
				upsert: true,
				new: true,
				runValidators: true,
			}
		);
		console.info('[onboarding:draft:upsert:success]', { userId: String(userId) });
		return result;
	} catch (err) {
		if (err && err.code === 11000) {
			console.warn('[onboarding:draft:upsert:duplicate]', { userId: String(userId) });
			return StudentProfile.findOne({ userId });
		}
		console.error('[onboarding:draft:upsert:error]', { userId: String(userId), message: err.message });
		throw err;
	}
}

async function submitProfile(userId, payload) {
	console.info('[onboarding:submit:start]', { userId: String(userId) });
	const normalized = await normalizePayload(payload);

	if (!normalized.major) {
		throw new OnboardingError(
			400,
			ERROR_CODES.INVALID_INPUT,
			'major: Major is required to submit your profile',
			{ field: 'major' }
		);
	}

	const now = new Date();
	const profile = await StudentProfile.findOneAndUpdate(
		{ userId, isDraft: true },
		{
			$set: {
				...normalized,
				isDraft: false,
				submittedAt: now,
				updatedAt: now,
			},
			$setOnInsert: {
				createdAt: now,
			},
		},
		{ new: true, runValidators: true }
	);

	if (!profile) {
		throw new OnboardingError(409, ERROR_CODES.ONBOARDING_ALREADY_COMPLETED, 'Profile already submitted', {
			isDraft: false,
		});
	}

	console.info('[onboarding:submit:accepted]', { userId: String(userId), profileId: String(profile._id) });

	Promise.resolve()
		.then(() => roadmapGenerationHandler({ userId, profileId: profile._id, payload: normalized }))
		.then(() => dispatchNotifications(userId, 'completed'))
		.catch(async () => {
			console.error('[onboarding:submit:roadmap-failed]', { userId: String(userId) });
			try {
				await dispatchNotifications(userId, 'failed');
			} catch (notificationError) {
				console.error('[onboarding:submit:notification-failed]', {
					userId: String(userId),
					message: notificationError?.message,
				});
			}
		});

	return {
		profile,
		isGeneric: isGenericProfile(normalized),
	};
}

module.exports = {
	canonicalizeCompletedCourses,
	getCourseCatalog,
	getDraft,
	setRoadmapGenerationHandler,
	upsertDraft,
	submitProfile,
};
