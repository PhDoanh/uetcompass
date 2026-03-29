'use strict';

function presentOwnerIdentity({
	displayName,
	major,
	privacySetting,
	fallbackName = 'Student',
}) {
	const resolvedMajor = major || null;
	if (privacySetting === 'anonymous') {
		return {
			displayName: 'Anonymous',
			major: resolvedMajor,
		};
	}

	const name = typeof displayName === 'string' && displayName.trim()
		? displayName.trim()
		: fallbackName;

	return {
		displayName: name,
		major: resolvedMajor,
	};
}

module.exports = {
	presentOwnerIdentity,
};
