const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const COURSE_UNIT_SCHEMA = {
	type: SchemaType.ARRAY,
	items: {
		type: SchemaType.OBJECT,
		properties: {
			code: { type: SchemaType.STRING },
			name: { type: SchemaType.STRING },
			credits: { type: SchemaType.NUMBER },
			major: { type: SchemaType.STRING },
			prerequisites: {
				type: SchemaType.ARRAY,
				items: { type: SchemaType.STRING },
			},
			type: { type: SchemaType.STRING },
			suggestedSemester: { type: SchemaType.NUMBER, nullable: true },
		},
		required: ['code', 'name', 'credits', 'major', 'prerequisites'],
	},
};

function getModel() {
	if (!process.env.GEMINI_API_KEY) {
		throw new Error('Missing GEMINI_API_KEY');
	}
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	return genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: COURSE_UNIT_SCHEMA,
		},
	});
}

async function parseCourseUnits(markdownContent, major) {
	const prompt = `Extract all course units from the following UET curriculum page for major "${major}". Return JSON only.\n\n${markdownContent}`;
	const result = await getModel().generateContent(prompt);
	const text = result?.response?.text?.();
	if (!text) {
		throw new Error('Gemini returned empty response');
	}

	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		throw new Error(`Gemini response is not valid JSON: ${error.message}`);
	}

	if (!Array.isArray(parsed)) {
		throw new Error('Gemini response must be an array of course units');
	}

	return parsed.map(unit => ({
		...unit,
		major: unit?.major || major,
	}));
}

module.exports = {
	COURSE_UNIT_SCHEMA,
	parseCourseUnits,
};
