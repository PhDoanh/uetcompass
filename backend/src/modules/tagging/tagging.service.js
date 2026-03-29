const { Skill, Tag, TaggingJob } = require('./tagging.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../lib/logger');
const config = require('../../lib/config');

class TaggingService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.llmApiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    // ... existing code ...

    async generateTags(skill) {
        const prompt = `Analyze the following skill and suggest relevant tags for it. Focus on technical skills, programming languages, frameworks, and concepts relevant to computer science and IT education.

Skill Name: ${skill.name}
Description: ${skill.description || 'No description provided'}
Domain: ${skill.domain}

Please respond with a JSON object containing:
- tags: array of objects with "name" (human-readable) and "confidence" (0-100)
- overall_confidence: number 0-100

Only suggest tags that are highly relevant. Limit to 5-10 tags maximum.

Example response:
{
  "tags": [
    {"name": "JavaScript", "confidence": 95},
    {"name": "Web Development", "confidence": 88}
  ],
  "overall_confidence": 92
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid LLM response format');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const tags = parsed.tags.map(tag => ({
                normalizedName: tag.name.toLowerCase().trim(),
                confidence: tag.confidence,
            }));

            return {
                tags,
                confidence: parsed.overall_confidence || Math.min(...tags.map(t => t.confidence)),
            };
        } catch (error) {
            logger.error('LLM API error:', error);
            throw new Error('Failed to generate tags from LLM');
        }
    }

    // ... existing code ...
}

module.exports = new TaggingService();