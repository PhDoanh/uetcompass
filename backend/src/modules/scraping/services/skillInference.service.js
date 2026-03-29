/**
 * T026: Skill Inference Service (User Story 2 & 3)
 * Extracts skills from job postings using Regex pattern matching
 */

// Common tech skill keywords for Regex pattern matching
const SKILL_KEYWORDS = [
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt',
  'Node.js', 'Express', 'Fastify', 'Nest.js',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'Redis',
  'Python', 'Java', 'C\\+\\+', 'C#', 'Go', 'Rust', 'TypeScript',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'HTML', 'CSS', 'SCSS', 'Tailwind', 'Bootstrap',
  'Git', 'GraphQL', 'REST', 'WebSocket', 'OAuth'
];

// Build dynamic regex pattern
const skillPattern = new RegExp(`\\b(${SKILL_KEYWORDS.join('|')})\\b`, 'gi');

/**
 * Extract skills from job posting snippets using Regex
 * @param {string} tavilySnippet - Single or multiple job posting snippets
 * @param {string} jobBoardContext - Additional context (source, title, etc.)
 * @returns {Promise<Array>} Array of {skillName, frequency, confidence}
 */
async function extractSkillsFromJobPostings(tavilySnippet, jobBoardContext = '') {
  try {
    const combined = `${tavilySnippet} ${jobBoardContext}`;

    // Extract skills using Regex
    const matches = combined.match(skillPattern) || [];
    const skillFrequency = {};

    matches.forEach(skill => {
      const normalized = skill.toLowerCase();
      skillFrequency[normalized] = (skillFrequency[normalized] || 0) + 1;
    });

    // Keep only skills with >= 3 occurrences
    const candidates = Object.entries(skillFrequency)
      .filter(([_, count]) => count >= 3)
      .map(([name, count]) => ({
        skillName: name,
        frequency: count,
        confidence: 'medium'
      }));

    // Return all extracted candidates (no Gemini validation)
    return candidates;
  } catch (error) {
    console.error('[SkillInference] Regex extraction failed:', error.message);
    return [];
  }
}



module.exports = {
  extractSkillsFromJobPostings,
  SKILL_KEYWORDS
};
