'use strict';

/**
 * Build the evaluation prompt for LLM providers
 * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
 * @param {object} profile - StudentProfile document
 * @returns {string} The evaluation prompt
 */
function buildSkillEvaluationPrompt(candidateSkills, profile) {
	return `You are evaluating skills for career relevance for a UET-VNU student.

Student Profile:
- Major: ${profile.major}
- Career Goal Role: ${profile.careerGoal?.role ?? 'not provided'}
- Career Goal Company Type: ${profile.careerGoal?.companyType ?? 'not provided'}
- Graduation Timeline: ${profile.careerGoal?.graduationTimeline ?? profile.graduationTimeline ?? 'not provided'}
- Personal Aspirations: ${profile.personalAspirations ?? 'not provided'}

Candidate skills from available courses:
${JSON.stringify(candidateSkills.map((c) => c.skillName))}

Instructions:
Return a JSON array of strings containing ONLY the skill names from the input list that are meaningfully relevant to the student's career goal.
Example: ["OOP", "SQL", "Web Development"]

Omit skills that are tangential, redundant, or not applicable to the career goal.
Return an empty array [] if no skills qualify.`;
}

module.exports = { buildSkillEvaluationPrompt };
