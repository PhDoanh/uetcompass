'use strict';

const { buildSkillEvaluationPrompt } = require('../prompt.utils');

/**
 * Anthropic Claude API Provider
 * Evaluates off-template skills using Claude 3.5 Sonnet
 */
class ClaudeProvider {
	constructor(apiKey) {
		this.apiKey = apiKey;
		this.model = 'claude-3-5-sonnet-20241022';
		this.name = 'claude';
	}

	/**
	 * Evaluate off-template skills using Claude
	 * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
	 * @param {object} profile - StudentProfile document
	 * @returns {Promise<Array<string>>}
	 */
	async evaluate(candidateSkills, profile) {
		if (!this.apiKey) {
			throw new Error('Claude API key not configured');
		}

		try {
			const Anthropic = require('@anthropic-ai/sdk');
			const client = new Anthropic({ apiKey: this.apiKey });

			const prompt = buildSkillEvaluationPrompt(candidateSkills, profile);

			const response = await client.messages.create({
				model: this.model,
				max_tokens: 2048,
				messages: [
					{
						role: 'user',
						content: prompt,
					},
				],
			});

			const content = response.content[0]?.text;
			if (!content) {
				throw new Error('Empty response from Claude');
			}

			// Extract JSON from response
			const parsed = this.parseJsonResponse(content);

			// Ensure it's an array
			const result = Array.isArray(parsed) ? parsed : parsed.skills || [];
			if (!Array.isArray(result)) {
				throw new Error('Invalid response format: expected array');
			}

			return result;
		} catch (error) {
			throw new Error(`Claude provider error: ${error.message}`);
		}
	}

	/**
	 * Parse JSON response which may be wrapped in markdown code blocks
	 */
	parseJsonResponse(content) {
		try {
			return JSON.parse(content);
		} catch {
			// Try extracting from markdown code blocks
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
			if (jsonMatch) {
				return JSON.parse(jsonMatch[1]);
			}
			throw new Error('Could not parse JSON from response');
		}
	}
}

module.exports = { ClaudeProvider };
