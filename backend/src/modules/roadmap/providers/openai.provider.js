'use strict';

const OpenAI = require('openai'); // Load once at the top
const { buildSkillEvaluationPrompt } = require('../prompt.utils');

/**
 * OpenAI API Provider
 * Evaluates off-template skills using OpenAI GPT models
 */
class OpenAIProvider {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.client = new OpenAI({ apiKey });
        this.model = 'gpt-4o-mini'; 
        this.name = 'openai';
    }

    /**
     * Evaluate off-template skills using OpenAI
     * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
     * @param {object} profile - StudentProfile document
     * @returns {Promise<Array<string>>}
     */
    async evaluate(candidateSkills, profile) {
        try {
            const prompt = buildSkillEvaluationPrompt(candidateSkills, profile);

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an educational advisor evaluating career-relevant skills. You must respond with a JSON array of strings.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.1,
                // Using json_object mode
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            const parsed = JSON.parse(content);
            
            // Standardize the output to always return an array
            const result = parsed.skills || (Array.isArray(parsed) ? parsed : Object.values(parsed)[0]);
            
            if (!Array.isArray(result)) {
                throw new Error('Invalid response format: result is not an array');
            }

            return result;
        } catch (error) {
            // Enhanced error logging to see if it's an API error or parsing error
            console.error(`[OpenAIProvider] ${error.message}`);
            throw new Error(`OpenAI provider error: ${error.message}`);
        }
    }
}

module.exports = { OpenAIProvider };