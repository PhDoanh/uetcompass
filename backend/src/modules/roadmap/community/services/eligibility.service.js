'use strict';

const DEFAULT_HOLD_DAYS = 7;

function getHoldDays() {
	const raw = Number.parseInt(process.env.Y_DAY_HOLD_DAYS || `${DEFAULT_HOLD_DAYS}`, 10);
	if (!Number.isInteger(raw) || raw < 0) {
		return DEFAULT_HOLD_DAYS;
	}
	return raw;
}

function getEligibility(acceptedAt) {
	const holdDays = getHoldDays();
	if (!acceptedAt) {
		return { eligible: false, daysUntilEligible: holdDays, holdDays };
	}

	const acceptedDate = new Date(acceptedAt);
	const eligibleAt = new Date(acceptedDate.getTime() + holdDays * 24 * 60 * 60 * 1000);
	const now = new Date();
	const eligible = now >= eligibleAt;
	if (eligible) {
		return { eligible: true, daysUntilEligible: 0, holdDays, eligibleAt };
	}

	const diffMs = eligibleAt.getTime() - now.getTime();
	const daysUntilEligible = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
	return { eligible: false, daysUntilEligible, holdDays, eligibleAt };
}

module.exports = {
	getHoldDays,
	getEligibility,
};
