'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

/**
 * Gemini is scoped narrowly: it only evaluates off-template skills for career relevance.
 * It returns { skillName, reason }[] â€” NOT full roadmap nodes.
 * Template matching, ordering, and node construction are deterministic system logic.
 */
const offTemplateEvalSchema = {
	type: SchemaType.ARRAY,
	items: {
		type: SchemaType.OBJECT,
		properties: {
			skillName: { type: SchemaType.STRING },
			reason:    { type: SchemaType.STRING },
		},
		required: ['skillName', 'reason'],
	},
};

function buildGeminiModel() {
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
	return genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: offTemplateEvalSchema,
		},
		thinkingConfig: { thinkingBudget: 0 },
	});
}

/**
 * Asks Gemini to evaluate which candidate skills are relevant to the student's career goal.
 * Returns only skills that pass the relevance check, each with a career-specific reason.
 * Short-circuits to [] immediately when no career goal is present (no AI call made).
 *
 * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
 * @param {object} profile - StudentProfile document
 * @returns {Promise<Array<{ skillName: string, reason: string }>>}
 */
async function evaluateOffTemplateSkills(candidateSkills, profile) {
	if (!profile.careerGoal?.role && !profile.careerGoal?.companyType) {
		return []; // No career goal â€” skip AI call
	}

	const prompt = `You are evaluating skills for career relevance for a UET-VNU student.

Student Profile:
- Major: ${profile.major}
- Career Goal Role: ${profile.careerGoal?.role ?? 'not provided'}
- Career Goal Company Type: ${profile.careerGoal?.companyType ?? 'not provided'}
- Graduation Timeline: ${profile.careerGoal?.graduationTimeline ?? profile.graduationTimeline ?? 'not provided'}
- Personal Aspirations: ${profile.personalAspirations ?? 'not provided'}

Candidate skills from available courses:
${JSON.stringify(candidateSkills)}

Instructions:
For each skill in the list that is meaningfully relevant to the student's career goal,
return an object with:
- skillName: the exact skill name from the input list
- reason: a clear, explicit explanation of why this skill matters for the student's specific
  role and company type. The reason MUST directly mention the student's target role and company
  type. Avoid generic statements; always justify the skill's relevance to the stated career goal.
  Good example: "For a Backend Engineer at a Product company, OOP is essential because it
  provides the foundation for writing maintainable, scalable service code."
  Bad example: "This skill is useful for your career."

Omit skills that are tangential, redundant, or not applicable to the career goal.
Return an empty array if no skills qualify.`;

	const result = await buildGeminiModel().generateContent(prompt);
	return JSON.parse(result.response.text());
}

module.exports = { evaluateOffTemplateSkills };

