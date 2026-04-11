const cfg = require('./curriculum.config');

function assertNonEmptyString(value, label) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${label} must be a non-empty string`);
	}
}

function loadAndValidateConfig() {
	const { programs = [], careerTracks = [], skillVocabulary = [] } = cfg;

	if (!Array.isArray(programs)) {
		throw new Error('programs must be an array');
	}

	const seenPrograms = new Set();
	for (const program of programs) {
		assertNonEmptyString(program?.programId, 'programId');
		if (seenPrograms.has(program.programId)) {
			throw new Error(`Duplicate programId: ${program.programId}`);
		}
		seenPrograms.add(program.programId);
	}

	const seenTracks = new Set();
	for (const track of careerTracks) {
		assertNonEmptyString(track?.trackId, 'careerTracks.trackId');
		if (seenTracks.has(track.trackId)) {
			throw new Error(`Duplicate career trackId: ${track.trackId}`);
		}
		seenTracks.add(track.trackId);
	}

	const normalizedSkills = Array.isArray(skillVocabulary)
		? skillVocabulary.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
		: [];

	return {
		programs,
		careerTracks,
		skillVocabulary: normalizedSkills,
		trackIdSet: seenTracks,
		skillSet: new Set(normalizedSkills),
	};
}

module.exports = {
	loadAndValidateConfig,
	assertNonEmptyString,
};
