const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIContext = require('./aiContext.model');

/**
 * T040: Gemini on-demand generation + cache service
 * Generates "Why This Course" content with caching and validation
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function getOrGenerateContext(courseCode, careerGoal, courseData) {
  try {
    // 1. Check cache
    const cached = await AIContext.findOne({ courseCode, careerGoal });
    if (cached && cached.content && cached.content.trim().length >= 50) {
      return { content: cached.content, cached: true };
    }

    // 2. Generate with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Explain why a Vietnamese IT student should take the course "${courseData.nameEn || courseCode}" (${courseData.nameVi || ''})
      for their career goal: "${careerGoal}".
      
      Keep response concise (2-3 sentences) and practical.
    `;

    const result = await model.generateContent(prompt);
    let content = result.response.text();

    // 3. Validate content
    if (!content || content.trim().length < 50) {
      return { content: '', cached: false, error: 'Content too short' };
    }

    if (/^I (cannot|am unable)/i.test(content)) {
      return { content: '', cached: false, error: 'Refusal pattern' };
    }

    // 4. Cache for future use
    await AIContext.updateOne(
      { courseCode, careerGoal },
      { courseCode, careerGoal, content, generatedAt: new Date() },
      { upsert: true }
    );

    return { content, cached: false };
  } catch (err) {
    console.error('Gemini generation error:', err);
    return { content: '', cached: false, error: err.message };
  }
}

module.exports = {
  getOrGenerateContext,
};
