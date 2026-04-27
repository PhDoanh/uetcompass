'use strict';

const { GeminiProvider } = require('./providers/gemini.provider');
const { OpenRouterProvider } = require('./providers/openrouter.provider');
const { ClaudeProvider } = require('./providers/claude.provider');

/**
 * Multi-provider LLM service with fallback logic
 * Evaluates off-template skills using multiple AI providers with automatic failover
 */

const { buildSkillEvaluationPrompt } = require('./prompt.utils');

class SkillEvaluationService {
       constructor(config = {}) {
	       this.providers = [];
	       this.config = {
		       timeout: config.timeout || 120000, // 2 minutes (120 seconds)
		       maxRetries: config.maxRetries || 2, // Retries per provider
		       logLevel: config.logLevel || 'info', // 'debug', 'info', 'warn', 'error'
		       ...config,
	       };

	       this.initializeProviders();
       }

       /**
	* Initialize providers from environment variables
	* Priority order: Gemini > OpenAI > Claude (fallback)
	*/
       initializeProviders() {
	       const geminiKey = process.env.GEMINI_API_KEY;
	       const openrouterKey = process.env.OPENROUTER_API_KEY;
	       const claudeKey = process.env.ANTHROPIC_API_KEY;

	       // Add providers in priority order (first = primary, rest = fallback)
	       if (geminiKey) {
		       this.providers.push(new GeminiProvider(geminiKey));
	       }
	       if (openrouterKey) {
		       this.providers.push(new OpenRouterProvider(openrouterKey));
	       }
	       if (claudeKey) {
		       this.providers.push(new ClaudeProvider(claudeKey));
	       }

	       if (this.providers.length === 0) {
		       throw new Error(
			       'No LLM providers configured. Set GEMINI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY environment variables.'
		       );
	       }

	       this.log('info', `Initialized ${this.providers.length} LLM providers: ${this.providers.map((p) => p.name).join(' → ')}`);
       }

       // Remove static buildPrompt; use buildSkillEvaluationPrompt from prompt.utils.js

	/**
	 * Evaluate off-template skills with automatic fallback
	 * Tries each provider in order until one succeeds
	 *
	 * @param {Array<{ skillName: string, relatedCourses: Array }>} candidateSkills
	 * @param {object} profile - StudentProfile document
	 * @returns {Promise<Array<string>>}
	 * @throws {Error} If all providers fail
	 */
	async evaluateOffTemplateSkills(candidateSkills, profile) {
		// Short-circuit if no career goal (no AI call needed)
		if (!profile.careerGoal?.role) {
			this.log('debug', 'No career goal provided, skipping AI evaluation');
			return [];
		}

		const errors = [];

		// Try each provider in order
		for (let i = 0; i < this.providers.length; i++) {
			const provider = this.providers[i];
			this.log('info', `Attempting skill evaluation with ${provider.name} (attempt ${i + 1}/${this.providers.length})`);

			try {
				const result = await this.callProviderWithTimeout(provider, candidateSkills, profile);
				this.log('info', `✓ Successfully evaluated skills using ${provider.name}`);
				return result;
			} catch (error) {
				const errorMsg = error.message || String(error);
				errors.push(`${provider.name}: ${errorMsg}`);
				this.log('warn', `✗ ${provider.name} failed: ${errorMsg}`);

				// If not the last provider, continue to next
				if (i < this.providers.length - 1) {
					this.log('info', `Falling back to ${this.providers[i + 1].name}...`);
				}
			}
		}

		// All providers failed
		const failureReport = errors.join('\n');
		const error = new Error(`All skill evaluation providers failed:\n${failureReport}`);
		error.providerErrors = errors;
		error.providersAttempted = this.providers.map((p) => p.name);
		this.log('error', `All providers failed. Attempted: ${error.providersAttempted.join(', ')}`);

		throw error;
	}

	/**
	 * Call provider with timeout wrapper
	 */
	async callProviderWithTimeout(provider, candidateSkills, profile) {
		return Promise.race([
			provider.evaluate(candidateSkills, profile),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error(`Timeout after ${this.config.timeout}ms`)),
					this.config.timeout
				)
			),
		]);
	}

	/**
	 * Get list of active providers
	 */
	getActiveProviders() {
		return this.providers.map((p) => ({
			name: p.name,
			model: p.model,
		}));
	}

	/**
	 * Simple logger
	 */
	log(level, message) {
		const levels = { debug: 0, info: 1, warn: 2, error: 3 };
		if (levels[level] >= levels[this.config.logLevel]) {
			const timestamp = new Date().toISOString();
			console.log(`[${timestamp}] [${level.toUpperCase()}] [SkillEval] ${message}`);
		}
	}
}

// Singleton instance
let serviceInstance = null;

/**
 * Get or create singleton instance
 */
function getSkillEvaluationService(config = {}) {
	if (!serviceInstance) {
		serviceInstance = new SkillEvaluationService(config);
	}
	return serviceInstance;
}

/**
 * Reset singleton (useful for testing)
 */
function resetSkillEvaluationService() {
	serviceInstance = null;
}

module.exports = {
	SkillEvaluationService,
	getSkillEvaluationService,
	resetSkillEvaluationService,
	evaluateOffTemplateSkills: (candidateSkills, profile) => {
		return getSkillEvaluationService().evaluateOffTemplateSkills(candidateSkills, profile);
	},
};
