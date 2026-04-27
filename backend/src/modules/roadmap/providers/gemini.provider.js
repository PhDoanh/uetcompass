'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const { buildSkillEvaluationPrompt } = require('../prompt.utils');

/**
 * Gemini API Provider
 * Evaluates off-template skills using Google Gemini 2.5 Flash
 */
class GeminiProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        // Updated to use the 2.5 series and the new Gemma 4 open-weights model
        this.models = process.env.GEMINI_MODELS
            ? process.env.GEMINI_MODELS.split(',').map((m) => m.trim())
            : [
                'gemini-2.0-flash',
                'gemma-4-31b-it', 
                'gemma-4-26b-it'
              ];
        this.name = 'gemini';
    }

	/**
	 * Build Gemini model instance
	 * @param {string} modelName
	 */
	buildModel(modelName) {
		const genAI = new GoogleGenerativeAI(this.apiKey);
		return genAI.getGenerativeModel({
			model: modelName,
			generationConfig: {
				responseMimeType: 'application/json',
				responseSchema: {
					type: SchemaType.ARRAY,
					items: {
						type: SchemaType.STRING,
					},
				},
			},
			thinkingConfig: { thinkingBudget: 0 },
		});
	}

	/**
	 * Evaluate off-template skills using Gemini
	 * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
	 * @param {object} profile - StudentProfile document
	 * @returns {Promise<Array<string>>}
	 */
	async evaluate(candidateSkills, profile) {
		if (!this.apiKey) {
			throw new Error('Gemini API key not configured');
		}

		const prompt = buildSkillEvaluationPrompt(candidateSkills, profile);
		
		let lastError;
		for (const modelName of this.models) {
			try {
				const model = this.buildModel(modelName);
				const result = await model.generateContent(prompt);
				const responseText = result.response.text();
				
				const cleanJson = (text) => {
					const start = text.indexOf('[');
					const end = text.lastIndexOf(']');
					if (start === -1 || end === -1) throw new Error("No JSON array found in response");
					return text.substring(start, end + 1);
				};
				const jsonOnly = cleanJson(responseText);
				// Validate and parse JSON response
				const parsed = JSON.parse(responseText);
				if (!Array.isArray(parsed)) {
					throw new Error('Invalid response format: expected array');
				}
				
				
				return parsed;
			} catch (error) {
				lastError = error;
				
				// Check for rate limit error (HTTP 429) or quota exhaustion
				const isRateLimit = error.status === 429 || 
					(error.message && (
						error.message.includes('429') || 
						error.message.toLowerCase().includes('rate limit') ||
						error.message.toLowerCase().includes('quota')
					));

				const isHighDemand = error.status === 503 || 
        			(error.message && (
						error.message.includes('503') || 
						error.message.toLowerCase().includes('overloaded') ||
						error.message.toLowerCase().includes('high demand')
					));

				if (isRateLimit || isHighDemand) {
					const reason = isRateLimit ? "Rate limit hit" : "High demand/Overloaded";
					console.warn(`[GeminiProvider] ${reason} for ${modelName}. Falling back to next model...`);
					continue;
				}

				// If not a rate limit or high demand, re-throw with provider context
				throw new Error(`Gemini provider error (${modelName}): ${error.message}`);
			}
		}

		// If all models failed with rate limits
		throw new Error(`Gemini provider error (all models rate-limited): ${lastError.message}`);
	}
}

module.exports = { GeminiProvider };
