'use strict';

const OpenAI = require('openai');
const { buildSkillEvaluationPrompt } = require('../prompt.utils');

class OpenRouterProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.models = process.env.OPENROUTER_MODELS
            ? process.env.OPENROUTER_MODELS.split(',').map((m) => m.trim())
            : ['openrouter/free']; 
        this.name = 'openrouter';
        
        this.client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: this.apiKey,
            defaultHeaders: {
                "HTTP-Referer": "your-app-url.com", // Recommended for OpenRouter rankings
                "X-Title": "Skill Evaluator",
            }
    }

    /**
     * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
     * @param {object} profile - StudentProfile document
     * @returns {Promise<Array<string>>}
     */
    async evaluate(candidateSkills, profile) {
        if (!this.apiKey) throw new Error('OpenRouter API key not configured');

        const prompt = buildSkillEvaluationPrompt(candidateSkills, profile);
        
        const cleanJson = (text) => {
            // Updated regex to be more greedy with whitespace and newlines
            const match = text.match(/\[[\s\S]*\]/); 
            if (!match) throw new Error("No JSON array found in response");
            return match[0].trim();
        };

        let lastError;
        for (const modelName of this.models) {
            try {
                const response = await this.client.chat.completions.create({
                    model: modelName,
                    messages: [{ role: "user", content: prompt }],
                    // response_format is crucial for free models to behave
                    response_format: { type: "json_object" },
                    temperature: 0.1, // Lower temperature = more stable JSON
                    max_tokens: 1000, 
                    timeout: 45000    // Free models are often slower; 45s is safer
                });

                const responseText = response.choices[0].message.content;
                const jsonContent = cleanJson(responseText);
                const parsed = JSON.parse(jsonContent);

                if (!Array.isArray(parsed)) throw new Error('Response is not an array');
                return parsed;

            } catch (error) {
                lastError = error;
                const status = error.status || error.response?.status;
                
                console.warn(`[OpenRouter] ${modelName} failed. Status: ${status}. Error: ${error.message}`);

                // 408: Timeout, 429: Rate Limit, 500-504: Server Issues
                const isRetryable = 
                    [408, 429, 500, 502, 503, 504].includes(status) || 
                    error instanceof SyntaxError || 
                    error.message.includes("JSON") ||
                    error.name === 'APITimeoutError';

                if (isRetryable) {
                    // This is where the "automation" happens: it moves to the next model in your list
                    continue; 
                }

                // If it's a 401 (Unauthorized) or 400 (Bad Request), don't bother retrying
                throw new Error(`OpenRouter fatal error (${modelName}): ${error.message}`);
            }
        }

        throw new Error(`All OpenRouter models failed. Final error: ${lastError.message}`);
    }
}

module.exports = { OpenRouterProvider };