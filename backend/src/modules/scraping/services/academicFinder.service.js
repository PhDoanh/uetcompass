/**
 * T013: Academic Finder Service (User Story 1 - Academic Material Finder)
 * Crawls each active RoadmapNode course by course name via Tavily
 * Classifies source type and document type
 */

const AcademicDocument = require('../models/academicDocument.model');
const tavilyAdapter = require('../adapters/tavily.adapter');
const nodesCatalog = require('./nodesCatalog.service');

/**
 * Classify source type based on URL domain
 * @param {string} url - Document URL
 * @return {string} sourceType enum: 'uet_official' | 'github' | 'external'
 */
function classifySourceType(url) {
  const urlLower = url.toLowerCase();
  
  // UET official sources: uet.vnu.edu.vn, uet.edu.vn, github.com/uet* repos (uet-, uet_, uet/)
  if (/uet\.(vnu\.)?edu\.vn|github\.com\/uet[\/-_]*/i.test(urlLower)) {
    return 'uet_official';
  }
  
  // GitHub (non-UET)
  if (urlLower.includes('github.com')) {
    return 'github';
  }
  
  return 'external';
}

/**
 * Detect document type from URL and title
 * @param {string} url - Document URL
 * @param {string} title - Document title
 * @return {string} documentType enum
 */
function detectDocumentType(url, title) {
  const combined = `${url} ${title}`.toLowerCase();
  
  // Slide: .pptx, .key, .odp or keywords
  if (/slide|presentation|\.pptx|\.key|\.odp|powerpoint/i.test(combined)) {
    return 'slide';
  }
  
  // Lecture notes: specific keywords and file types
  if (/lecture.*note|note.*lecture|\blecture\b|\bnote\b|\blec\b|\bln\b|lecture.*outline|\.notes/i.test(combined)) {
    return 'lecture_note';
  }
  
  // Syllabus: course curriculum documents
  if (/syllabus|giáo\s+trình|curriculum|course\s+outline|course\s+guide/i.test(combined)) {
    return 'syllabus';
  }
  
  // Exercises: homework, assignments, work samples
  if (/homework|exercise|bài\s+tập|assignment|\bex\b|workshop|\.(zip|rar|7z)$/i.test(combined)) {
    return 'exercise';
  }
  
  // Code samples: GitHub, source code indicators (require code-related keywords or file extensions)
  if (/\bcode\b|github.*\b(code|example|repo)\b|\.(java|js|py|cpp|csharp|ts|jsx)\b/i.test(combined)) {
    return 'code_sample';
  }
  
  return 'other';
}



/**
 * Main crawl logic: process all active RoadmapNodes
 * @param {Array} roadmapNodes - Optional array of nodes to process (defaults to all active)
 * @return {Promise<Array>} Array of {roadmapNodeId, courseName, documentsFound}
 */
async function crawlAcademicMaterialsPerNode(roadmapNodes = null) {
  try {
    // Get active roadmap nodes if not provided
    if (!roadmapNodes) {
      roadmapNodes = await nodesCatalog.getActiveRoadmapNodes();
    }

    const results = [];
    console.log(`[AcademicFinder] Processing ${roadmapNodes.length} active nodes...`);

    for (const node of roadmapNodes) {
      try {
        const { _id: nodeId, courseName } = node;

        console.log(`[AcademicFinder] Crawling node: "${courseName}" (${nodeId})`);

        // Search Tavily for academic materials
        const tavilyResults = await tavilyAdapter.academicSearch(courseName);

        let documentsFound = 0;

        for (const result of tavilyResults) {
          try {
            const { title, url, snippet, source } = result;

            // Classify and detect
            const sourceType = classifySourceType(url);
            const documentType = detectDocumentType(url, title);

            // No skill inference - all documents visible
            const isVisible = true;

            // Upsert: one document per unique (url, roadmapNodeId) pair
            // If same URL is crawled again, timestamp is updated
            const upsertResult = await AcademicDocument.findOneAndUpdate(
              { url, roadmapNodeId: nodeId },
              {
                title,
                url,
                roadmapNodeId: nodeId,
                skillId: null,
                sourceType,
                documentType,
                courseName,
                crawlReason: 'course_name_match',
                inferenceConfidence: null,
                isVisible,
                lastCrawledAt: new Date()
              },
              { upsert: true, new: true }
            );

            if (upsertResult) {
              documentsFound++;
            }
          } catch (docError) {
            console.error(`[AcademicFinder] Failed to process document "${result.title}":`, docError.message);
            // Continue with next document
          }
        }

        results.push({
          roadmapNodeId: nodeId,
          courseName,
          documentsFound
        });

      } catch (nodeError) {
        console.error(`[AcademicFinder] Failed to process node "${node.courseName}":`, nodeError.message);
        // Continue with next node - don't crash the entire crawl
        results.push({
          roadmapNodeId: node._id,
          courseName: node.courseName,
          documentsFound: 0,
          error: nodeError.message
        });
      }
    }

    console.log('[AcademicFinder] Crawl complete:', results);
    return results;

  } catch (error) {
    console.error('[AcademicFinder] Crawl failed:', error.message);
    throw error;
  }
}

/**
 * Run the crawl - callable by job scheduler or HTTP trigger
 */
async function runAcademicFinder() {
  return crawlAcademicMaterialsPerNode();
}

module.exports = {
  crawlAcademicMaterialsPerNode,
  runAcademicFinder,
  classifySourceType,
  detectDocumentType
};
