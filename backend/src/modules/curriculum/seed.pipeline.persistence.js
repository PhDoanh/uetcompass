async function upsertCourseUnits(CourseUnitModel, rows) {
	if (!rows.length) return { matchedCount: 0, upsertedCount: 0, modifiedCount: 0 };

	const ops = rows.map((row) => ({
		updateOne: {
			filter: { code: row.code, programId: row.programId },
			update: { $set: row },
			upsert: true,
		},
	}));

	return CourseUnitModel.bulkWrite(ops, { ordered: false });
}

async function upsertPrograms(ProgramModel, rows) {
	if (!rows.length) return { matchedCount: 0, upsertedCount: 0, modifiedCount: 0 };

	const ops = rows.map((row) => ({
		updateOne: {
			filter: { programId: row.programId },
			update: { $set: row },
			upsert: true,
		},
	}));

	return ProgramModel.bulkWrite(ops, { ordered: false });
}

async function upsertProgramOutcomes(ProgramOutcomeModel, rows) {
	if (!rows.length) return { matchedCount: 0, upsertedCount: 0, modifiedCount: 0 };

	const ops = rows.map((row) => ({
		updateOne: {
			filter: { poId: row.poId },
			update: { $set: row },
			upsert: true,
		},
	}));

	return ProgramOutcomeModel.bulkWrite(ops, { ordered: false });
}

module.exports = {
	upsertCourseUnits,
	upsertPrograms,
	upsertProgramOutcomes,
};
