const onboardingService = require('./onboarding.service');
const { toHttpError } = require('./onboarding.errors');

async function getDraft(req, res) {
	try {
		const draft = await onboardingService.getDraft(req.user.userId);

		if (!draft) {
			return res.status(204).send();
		}

		if (draft.isDraft === false) {
			return res.status(403).json({
				error: {
					code: 'ONBOARDING_ALREADY_COMPLETED',
					message: 'Onboarding is complete. Use the profile settings page to make changes.',
					details: { isDraft: false },
				},
			});
		}

		return res.status(200).json(draft);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function getCourseCatalog(req, res) {
	try {
		const payload = await onboardingService.getCourseCatalog();
		return res.status(200).json(payload);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function putDraft(req, res) {
	try {
		const draft = await onboardingService.upsertDraft(req.user.userId, req.body || {});
		return res.status(200).json(draft);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function submit(req, res) {
	try {
		const result = await onboardingService.submitProfile(req.user.userId, req.body || {});
		return res.status(202).json({
			message: 'Profile submitted. Roadmap generation in progress.',
			isGeneric: result.isGeneric,
		});
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

module.exports = {
	getCourseCatalog,
	getDraft,
	putDraft,
	submit,
};
