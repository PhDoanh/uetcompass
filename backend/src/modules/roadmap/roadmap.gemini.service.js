'use strict';

const mockCourseResource = require('./mockData/mockCourseResource');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const roadmapNodeSchema = {
	type: SchemaType.ARRAY,
	items: {
		type: SchemaType.OBJECT,
		properties: {
			courseCode:        { type: SchemaType.STRING },
			courseName:        { type: SchemaType.STRING },
			credits:           { type: SchemaType.NUMBER },
			suggestedSemester: { type: SchemaType.NUMBER },
			reason:            { type: SchemaType.STRING },
			skills:            { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
		},
		required: [
			'courseCode',
			'courseName',
			'credits',
			'reason',
			'skills',
		],
	},
};

function buildGeminiModel() {
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
	return genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: roadmapNodeSchema,
		},
	});
}

async function callGemini(profile, courseUnits, existingRoadmap = null) {
	const baseContext = existingRoadmap
		? `\nExisting accepted roadmap (use as base context — informs but does not constrain the new output):\n${JSON.stringify(existingRoadmap.nodes)}`
		: '';

	const prompt = `You are a personalised learning roadmap generator for UET-VNU students.

Student Profile:
- Major: ${profile.major}
- Career Goal Role: ${profile.careerGoal?.role ?? 'not provided'}
- Career Goal Company Type: ${profile.careerGoal?.companyType ?? 'not provided'}
- Graduation Timeline: ${profile.careerGoal?.graduationTimeline ?? profile.graduationTimeline ?? 'not provided'}
- Personal Aspirations: ${profile.personalAspirations ?? 'not provided'}
- Completed Course Codes: ${
	(profile.completedCourses ?? []).map((c) => c.courseCode).join(', ') || 'none'
}

Available CourseUnits (DAG with prerequisites):
${JSON.stringify(courseUnits)}
${baseContext}

Instructions:
1. Select only career-relevant courses: all required-type courses that are direct or transitive
   prerequisites of career-relevant courses, plus only the electives that best match the career goal.
2. Exclude courses listed in Completed Course Codes as actionable nodes.
   Treat completed courses as satisfied prerequisites when determining accessible nodes.
3. Return selected nodes in valid topological order: each node MUST appear after all its prerequisites.
4. If no career goal is provided, include all required-type courses in topological order.
5. For each node, populate:
    - skills: a comma-separated string of the top 3-5 most important skills or concepts taught in the course that are relevant to the career goal.
	  Focus on specific, actionable skills (e.g. "REST API design", "Dynamic Programming") rather than vague topics (e.g. "Web Development", "Algorithms").
	  The skills MUST be directly relevant to the student's stated career goal and aspirations.
	- reason: a clear, explicit explanation of why this course is included for this student's career goal. 
	The reason MUST directly mention the student's target role and company type (e.g. "Backend Engineer at a Tech Startup") and explain why the course is a stepping stone or required for that specific career. 
	Avoid generic statements; always justify the course's relevance to the stated career goal.
	Good reason example:
	- "For a Backend Engineer at a Tech Startup, this course is crucial because it teaches object-oriented design principles that help you structure backend code for maintainability and scalability. 
	These skills are directly applied when building features like user authentication, data models, or APIs—regardless of whether your company uses Node.js, Java, or Python. 
	Mastery of OOP concepts enables you to quickly adapt to different technology stacks and contribute effectively to backend projects in any fast-paced environment."
	Bad reason example:
	- "This course is useful for your career."
   Do NOT combine multiple concepts into one string (e.g. WRONG: "OOP principles (encapsulation, inheritance)").
   Mix both theoretical concepts and practical technologies — do not list only abstract concepts.
6. Do NOT include a skills or resources field — the system will append both as empty arrays after parsing.`;



	const result = await buildGeminiModel().generateContent(prompt);
	const nodes = JSON.parse(result.response.text());
	// Attach resources from mockCourseResource if available
	return nodes.map((node) => {
		const resource = mockCourseResource[node.courseCode] || {};
		return {
			...node,
			resources: resource.resources || [],
		};
	});
}

module.exports = { callGemini };
