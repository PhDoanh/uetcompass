const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const CALL1_RESPONSE_SCHEMA = {
	type: 'object',
	required: ['program', 'programOutcomes', 'courseUnits'],
	properties: {
		program: {
			type: 'object',
			properties: {
				nameVI: { type: 'string' },
				nameEN: { type: 'string' },
				degree: { type: 'string', enum: ['bachelor', 'engineer', 'master', 'doctoral'] },
				durationYears: { type: 'number' },
				totalCredits: { type: 'number' },
				objectives: { type: 'string' },
				creditBlocks: {
					type: 'array',
					items: {
						type: 'object',
						required: ['blockName', 'requiredCredits'],
						properties: {
							blockName: { type: 'string' },
							requiredCredits: { type: 'number' },
						},
					},
				},
			},
		},
		programOutcomes: {
			type: 'array',
			items: {
				type: 'object',
				required: ['description'],
				properties: {
					poId: { type: 'string' },
					description: { type: 'string' },
				},
			},
		},
		courseUnits: {
			type: 'array',
			items: {
				type: 'object',
				required: ['code', 'name', 'credits', 'prerequisites'],
				properties: {
					code: { type: 'string' },
					name: { type: 'string' },
					credits: { type: 'number' },
					prerequisites: { type: 'array', items: { type: 'string' } },
					type: { type: 'string', enum: ['required', 'elective'] },
					theoryHours: { type: 'number' },
					practiceHours: { type: 'number' },
					block: { type: 'string' },
				},
			},
		},
	},
};

const CALL2_RESPONSE_SCHEMA = {
	type: 'object',
	required: ['courseUnits', 'programOutcomes'],
	properties: {
		program: {
			type: 'object',
			properties: {
				careerTracks: { type: 'array', items: { type: 'string' } },
			},
		},
		courseUnits: {
			type: 'array',
			items: {
				type: 'object',
				required: ['code', 'difficultyLevel', 'careerTracks', 'skills'],
				properties: {
					code: { type: 'string' },
					difficultyLevel: { type: 'number', minimum: 1, maximum: 5 },
					careerTracks: { type: 'array', items: { type: 'string' } },
					skills: { type: 'array', items: { type: 'string' } },
				},
			},
		},
		programOutcomes: {
			type: 'array',
			items: {
				type: 'object',
				required: ['poId', 'careerTracks'],
				properties: {
					poId: { type: 'string' },
					careerTracks: { type: 'array', items: { type: 'string' } },
				},
			},
		},
	},
};

function getModel(responseSchema) {
	if (!process.env.GEMINI_API_KEY) {
		throw new Error('Missing GEMINI_API_KEY');
	}

	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	return genAI.getGenerativeModel({
		model: MODEL_NAME,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema,
		},
	});
}

async function callGeminiJSON({ prompt, schema }) {
	const result = await getModel(schema).generateContent(prompt);
	const text = result?.response?.text?.();
	if (!text) throw new Error('Gemini returned empty response');
	return JSON.parse(text);
}

function computeEmphasis(theoryHours, practiceHours) {
	const t = Number(theoryHours ?? 0);
	const p = Number(practiceHours ?? 0);
	const total = t + p;
	if (total <= 0) return null;
	const ratio = p / total;
	if (ratio < 0.25) return 'theory-heavy';
	if (ratio <= 0.55) return 'balance';
	return 'project-heavy';
}

function filterVocabularySkills(skills, skillSet) {
	const kept = [];
	const dropped = [];
	for (const skill of skills || []) {
		if (skillSet.has(skill)) kept.push(skill);
		else dropped.push(skill);
	}
	return { kept, dropped };
}

function filterCareerTracks(careerTracks, trackIdSet) {
	const kept = [];
	const dropped = [];
	for (const trackId of careerTracks || []) {
		if (trackIdSet.has(trackId)) kept.push(trackId);
		else dropped.push(trackId);
	}
	return { kept, dropped };
}

function buildCall1Prompt({ programId, scrapeType, markdown, sourceDocuments }) {
	const documents = Array.isArray(sourceDocuments) && sourceDocuments.length > 0
		? sourceDocuments
		: [{ scrapeType: scrapeType || 'unknown', markdown: markdown || '' }];

	const sourceContext = documents
		.map((item, index) => {
			const label = item?.scrapeType || 'unknown';
			const content = item?.markdown || '';
			return `### SOURCE ${index + 1} (${label})\n${content}`;
		})
		.join('\n\n');

	return `
## CONTEXT
### PROGRAM
Program ID: ${programId}

### SOURCES (multi-page context)
${sourceContext}

## ROLE
You are a curriculum extraction AI for UET training-program pages.
Your task is to extract structured JSON for Program, ProgramOutcome, and CourseUnit records.

## STRICT CONSTRAINTS
- Return ONLY valid JSON object. No markdown, no prose, no comments.
- Root keys MUST be exactly: program, programOutcomes, courseUnits.
- If content is missing:
	- programOutcomes must be []
	- courseUnits must be []
- courseUnits[*].prerequisites MUST always be an array (possibly empty).
- Numeric fields MUST be numbers, not strings: credits, theoryHours, practiceHours, requiredCredits.
- courseUnits[*].type if present MUST be one of: required, elective.
- Do NOT invent course codes, poId, credits, hours, or outcomes not evidenced by source content.

## NORMALIZATION RULES
- Preserve Vietnamese text faithfully when available.
- Trim extra whitespace.
- prerequisites must contain only course-code tokens (e.g., INT2210).

## OUTPUT EXAMPLE (return only valid JSON)
{
	"program": {
		"nameVI": "...",
		"nameEN": "...",
		"degree": "bachelor|engineer|master|doctoral",
		"durationYears": 4,
		"totalCredits": 130,
		"objectives": "...",
		"creditBlocks": [
			{ "blockName": "...", "requiredCredits": 30 }
		]
	},
	"programOutcomes": [
		{
			"poId": "PO-01",
			"description": "..."
		},
		...
	],
	"courseUnits": [
		{
			"code": "INT2210",
			"name": "...",
			"credits": 3,
			"prerequisites": ["INT1001"],
			"type": "required",
			"theoryHours": 30,
			"practiceHours": 15,
			"block": "..."
		},
		...
	]
}
`;
}

function buildCall2Prompt({ program, courseUnits, programOutcomes, careerTracks, skillVocabulary }) {
	return `
## CONTEXT
### PROGRAM
Name: ${program.nameEN || program.nameVI}
Degree: ${program.degree} (${program.durationYears} years, ${program.totalCredits} credits)
Objectives: ${program.objectives || ''}
Credit blocks: ${JSON.stringify(program.creditBlocks || [])}

### CAREER_TRACKS (authoritative — do not invent new ones)
${JSON.stringify(careerTracks)}

### SKILL_VOCABULARY (authoritative — do not invent new tags)
${JSON.stringify(skillVocabulary)}

### PROGRAM_OUTCOMES
${JSON.stringify(programOutcomes)}

### COURSES
${JSON.stringify(courseUnits)}

## ROLE
You are a curriculum enrichment AI. Given a complete university degree PROGRAM,
your task is to infer enrichment fields for ALL COURSES and PROGRAM_OUTCOMES in a
SINGLE response. Reason holistically - assess each item in relation to all others.

## STRICT CONSTRAINTS
- Use ONLY the provided program data. No external knowledge.
- difficultyLevel is RELATIVE within this program (1=easiest, 5=hardest).
- careerTracks must be chosen ONLY from the trackIds listed in CAREER_TRACKS above.
- Infer program.careerTracks as tracks that are strongly supported by the full curriculum evidence.
- skills must be chosen ONLY from the skill tags listed in SKILL_VOCABULARY above. Assign max 5 skills per course. Only assign if highly confident.
- For ProgramOutcome.careerTracks: assign ALL tracks this outcome is relevant to.

## REASONING APPROACH
For difficultyLevel: consider prerequisite depth, semester position, workload (emphasis), block type.
For careerTracks: consider which career profile benefits most from this course/outcome.
For skills: consider what a student can DO after completing this course.

## OUTPUT EXAMPLE (return only valid JSON, no other text)
{
	"program": {
		"careerTracks": ["Software Engineer General", "AI Data Engineer"]
	},
	"courseUnits": [
		{
			"code": "INT2210",
			"difficultyLevel": 3,
			"careerTracks": ["Backend Engineer"],
			"skills": ["data-structures", "algorithm-analysis", "oop"]
		},
		...
	],
	"programOutcomes": [
		{
			"poId": "PO-01",
			"careerTracks": ["Software Engineer Japan", "Software Engineer General"]
		},
		...
	]
}
`;
}

module.exports = {
	CALL1_RESPONSE_SCHEMA,
	CALL2_RESPONSE_SCHEMA,
	callGeminiJSON,
	buildCall1Prompt,
	buildCall2Prompt,
	computeEmphasis,
	filterVocabularySkills,
	filterCareerTracks,
};
