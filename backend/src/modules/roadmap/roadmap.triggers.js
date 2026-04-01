'use strict';

const { triggerGeneration, isGenerating, __handleSigterm } = require('./generation.service');
const { setRoadmapGenerationHandler } = require('../onboarding/onboarding.service');

// Adapter: onboarding calls handler({ userId, profileId, payload })
// generation.service expects triggerGeneration(userId, studentProfileId, triggerReason)
function handleProfileSubmission({ userId }) {
	if (isGenerating(userId)) {
		console.warn('[roadmap] Generation already active for user — skipping profile_submission trigger', { userId });
		return;
	}
	triggerGeneration(userId, 'profile_submission').catch((err) => {
		if (err.code !== 'CONFLICT') {
			console.error('[roadmap] Unexpected error triggering generation on profile submission:', err);
		}
	});
}

// Self-register: wire Feature 001 → Feature 009 at module load time
setRoadmapGenerationHandler(handleProfileSubmission);

// Feature 009: SIGTERM handler — surface failures for any pending previews before exit
function registerSigtermHandler() {
   process.on('SIGTERM', async () => {
	   console.log('[roadmap] SIGTERM received — flushing roadmap preview state');
	   await __handleSigterm();
	   process.exit(0);
   });
}

module.exports = { registerSigtermHandler };

