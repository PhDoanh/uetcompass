const { Types } = require('mongoose');
const { StudentProfile } = require('./onboarding.model');
const { validateFreeText } = require('./onboarding.validation');
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

function normalizeNullableText(value) {
	if (value == null) {
		return null;
	}
	const trimmed = String(value).trim();
	return trimmed.length === 0 ? null : trimmed;
}

function validateField(fieldName, value) {
	const result = validateFreeText(value);
	if (!result.valid) {
		throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, `${fieldName}: ${result.reason}`, {
			field: fieldName,
		});
	}
}

function canonicalizeCompletedCourses(completedCourses = []) {
	if (!Array.isArray(completedCourses)) {
		throw new OnboardingError(400, ERROR_CODES.INVALID_INPUT, 'completedCourses must be an array', {
			field: 'completedCourses',
		});
	}

	const byIdentity = new Map();

	for (const item of completedCourses) {
		if (!item || !item.major || !item.courseCode) {
			continue;
		}

		const major = String(item.major).trim();
		const courseCode = String(item.courseCode).trim();
		if (!major || !courseCode) {
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

function normalizePayload(payload = {}) {
	const careerGoal = payload.careerGoal || {};
	validateField('careerGoal.role', careerGoal.role);
	validateField('careerGoal.companyType', careerGoal.companyType);
	validateField('personalAspirations', payload.personalAspirations);

	return {
		...(Object.prototype.hasOwnProperty.call(payload, 'major')
			? { major: normalizeNullableText(payload.major) }
			: {}),
		...(Object.prototype.hasOwnProperty.call(payload, 'completedCourses')
			? { completedCourses: canonicalizeCompletedCourses(payload.completedCourses) }
			: {}),
		...(Object.prototype.hasOwnProperty.call(payload, 'careerGoal')
			? {
				careerGoal: {
					role: normalizeNullableText(careerGoal.role),
					companyType: normalizeNullableText(careerGoal.companyType),
					graduationTimeline: normalizeNullableText(careerGoal.graduationTimeline),
				},
			}
			: {}),
		...(Object.prototype.hasOwnProperty.call(payload, 'personalAspirations')
			? { personalAspirations: normalizeNullableText(payload.personalAspirations) }
			: {}),
	};
}

function isGenericProfile(payload) {
	const completedCourses = payload.completedCourses || [];
	const careerGoal = payload.careerGoal || {};
	const hasRole = !!normalizeNullableText(careerGoal.role);
	const hasCompanyType = !!normalizeNullableText(careerGoal.companyType);
	const hasTimeline = !!normalizeNullableText(careerGoal.graduationTimeline);
	const hasAspirations = !!normalizeNullableText(payload.personalAspirations);
	return completedCourses.length === 0 && !hasRole && !hasCompanyType && !hasTimeline && !hasAspirations;
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

async function upsertDraft(userId, payload) {
	console.info('[onboarding:draft:upsert:start]', { userId: String(userId) });
	await assertDraftWritable(userId);

	const normalized = normalizePayload(payload);
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
	const normalized = normalizePayload(payload);

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
	getDraft,
	setRoadmapGenerationHandler,
	upsertDraft,
	submitProfile,
};
