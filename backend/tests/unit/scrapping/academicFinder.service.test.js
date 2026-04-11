/**
 * T016: Academic Finder Service Unit Tests (User Story 1)
 */

describe('Academic Finder Service', () => {
  let academicFinder;
  let mockTavily;
  let mockNodesCatalog;
  let mockAcademicDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock dependencies
    jest.doMock('../adapters/tavily.adapter', () => ({
      academicSearch: jest.fn()
    }));

    jest.doMock('../models/academicDocument.model', () => ({
      findOneAndUpdate: jest.fn()
    }));

    jest.doMock('../services/nodesCatalog.service', () => ({
      getActiveRoadmapNodes: jest.fn()
    }));

    mockTavily = require('../../../src/modules/scraping/adapters/tavily.adapter');
    mockAcademicDocument = require('../../../src/modules/scraping/models/academicDocument.model');
    mockNodesCatalog = require('../../../src/modules/scraping/services/nodesCatalog.service');

    academicFinder = require('../../../src/modules/scraping/services/academicFinder.service');
  });

  afterEach(() => {
    jest.dontMock('../adapters/tavily.adapter');
    jest.dontMock('../models/academicDocument.model');
    jest.dontMock('../services/nodesCatalog.service');
  });

  describe('classifySourceType', () => {
    it('should classify UET official URLs (uet.vnu.edu.vn)', () => {
      const result1 = academicFinder.classifySourceType('https://uet.vnu.edu.vn/slides.pdf');
      expect(result1).toBe('uet_official');

      const result2 = academicFinder.classifySourceType('http://uet.vnu.edu.vn/courses/web');
      expect(result2).toBe('uet_official');
    });

    it('should classify UET official URLs (uet.edu.vn)', () => {
      const result = academicFinder.classifySourceType('https://uet.edu.vn/resources/notes');
      expect(result).toBe('uet_official');
    });

    it('should classify UET GitHub repos (github.com/uet-*, github.com/uet_*)', () => {
      const result1 = academicFinder.classifySourceType('https://github.com/uet-dev/web-course');
      expect(result1).toBe('uet_official');

      const result2 = academicFinder.classifySourceType('https://github.com/uet_courses/database-design');
      expect(result2).toBe('uet_official');

      const result3 = academicFinder.classifySourceType('https://github.com/uet/java-basics');
      expect(result3).toBe('uet_official');
    });

    it('should classify GitHub (non-UET) URLs', () => {
      const result = academicFinder.classifySourceType('https://github.com/someuser/web-tutorial');
      expect(result).toBe('github');
    });

    it('should classify external URLs', () => {
      const result = academicFinder.classifySourceType('https://example.com/lecture-notes.pdf');
      expect(result).toBe('external');
    });

    it('should handle uppercase URLs correctly', () => {
      const result = academicFinder.classifySourceType('HTTPS://UET.VNU.EDU.VN/SLIDES.PDF');
      expect(result).toBe('uet_official');
    });
  });

  describe('detectDocumentType', () => {
    it('should detect slide documents (.pptx, .key, .odp, keywords)', () => {
      const result1 = academicFinder.detectDocumentType('https://course.com/slides.pptx', 'Chapter 1');
      expect(result1).toBe('slide');

      const result2 = academicFinder.detectDocumentType('https://course.com/presentation.key', 'Week 2 Slides');
      expect(result2).toBe('slide');

      const result3 = academicFinder.detectDocumentType('https://course.com/class.odp', 'Intro');
      expect(result3).toBe('slide');

      const result4 = academicFinder.detectDocumentType('https://course.com/lecture', 'PowerPoint Presentation');
      expect(result4).toBe('slide');
    });

    it('should detect lecture notes (various patterns)', () => {
      const result1 = academicFinder.detectDocumentType('https://course.com/notes.pdf', 'Lecture Notes Week 1');
      expect(result1).toBe('lecture_note');

      const result2 = academicFinder.detectDocumentType('https://course.com/chapter.pdf', 'Lecture Outline');
      expect(result2).toBe('lecture_note');

      const result3 = academicFinder.detectDocumentType('https://course.com/w1.txt', 'Note on Algorithms');
      expect(result3).toBe('lecture_note');
    });

    it('should detect syllabus documents (Vietnamese & English)', () => {
      const result1 = academicFinder.detectDocumentType('https://course.com/syllabus.pdf', 'Course Syllabus');
      expect(result1).toBe('syllabus');

      const result2 = academicFinder.detectDocumentType('https://course.com/giáo_trình.pdf', 'Giáo trình môn học');
      expect(result2).toBe('syllabus');

      const result3 = academicFinder.detectDocumentType('https://course.com/outline.pdf', 'Course Outline');
      expect(result3).toBe('syllabus');
    });

    it('should detect exercise/homework documents', () => {
      const result1 = academicFinder.detectDocumentType('https://course.com/homework.zip', 'Bài tập tuần 3');
      expect(result1).toBe('exercise');

      const result2 = academicFinder.detectDocumentType('https://course.com/assignment.rar', 'Exercise');
      expect(result2).toBe('exercise');

      const result3 = academicFinder.detectDocumentType('https://course.com/practice.pdf', 'Workshop');
      expect(result3).toBe('exercise');
    });

    it('should detect code samples (source files, GitHub)', () => {
      const result1 = academicFinder.detectDocumentType('https://github.com/course/examples', 'Example code');
      expect(result1).toBe('code_sample');

      const result2 = academicFinder.detectDocumentType('https://repo.com/src/main.java', 'Java Example');
      expect(result2).toBe('code_sample');

      const result3 = academicFinder.detectDocumentType('https://gist.com/algo.py', 'Python source');
      expect(result3).toBe('code_sample');
    });

    it('should fallback to "other" for unknown types', () => {
      const result = academicFinder.detectDocumentType('https://example.com/random', 'Some content');
      expect(result).toBe('other');
    });
  });

  describe('crawlAcademicMaterialsPerNode', () => {
    it('should process all nodes and upsert documents', async () => {
      const mockNodes = [
        { _id: 'node1', courseName: 'Web Development' },
        { _id: 'node2', courseName: 'Database Design' }
      ];

      mockNodesCatalog.getActiveRoadmapNodes.mockResolvedValue(mockNodes);

      mockTavily.academicSearch
        .mockResolvedValueOnce([
          {
            title: 'Web Dev Slides',
            url: 'https://uet.vnu.edu.vn/web.pdf',
            snippet: 'HTML, CSS, JavaScript',
            source: 'UET'
          }
        ])
        .mockResolvedValueOnce([
          {
            title: 'DB Design Guide',
            url: 'https://github.com/example/db-guide',
            snippet: 'Database normalization and design patterns',
            source: 'GitHub'
          }
        ]);

      mockAcademicDocument.findOneAndUpdate
        .mockResolvedValueOnce({ _id: 'doc1' })
        .mockResolvedValueOnce({ _id: 'doc2' });

      const results = await academicFinder.crawlAcademicMaterialsPerNode(mockNodes);

      expect(results).toHaveLength(2);
      expect(results[0].documentsFound).toBe(1);
      expect(results[1].documentsFound).toBe(1);
    });

    it('should handle node errors without stopping crawl', async () => {
      const mockNodes = [
        { _id: 'node1', courseName: 'Valid Course' },
        { _id: 'node2', courseName: 'Error Course' }
      ];

      mockNodesCatalog.getActiveRoadmapNodes.mockResolvedValue(mockNodes);

      mockTavily.academicSearch
        .mockResolvedValueOnce([{ title: 'Doc1', url: 'https://doc1.com', snippet: 'test', source: 'test' }])
        .mockRejectedValueOnce(new Error('Tavily error'));

      mockAcademicDocument.findOneAndUpdate.mockResolvedValue({ _id: 'doc1' });

      const results = await academicFinder.crawlAcademicMaterialsPerNode(mockNodes);

      // Should have results for both nodes, despite error on second
      expect(results).toHaveLength(2);
      expect(results[0].documentsFound).toBe(1);
      expect(results[1].documentsFound).toBe(0);
      expect(results[1].error).toBeDefined();
    });

    it('should deduplicate by (url, roadmapNodeId)', async () => {
      const mockNodes = [{ _id: 'node1', courseName: 'Web Dev' }];
      mockNodesCatalog.getActiveRoadmapNodes.mockResolvedValue(mockNodes);

      mockTavily.academicSearch.mockResolvedValue([
        { title: 'Doc', url: 'https://doc.com', snippet: 'content', source: 'source' }
      ]);

      mockAcademicDocument.findOneAndUpdate
        .mockResolvedValue({ _id: 'doc1' });

      await academicFinder.crawlAcademicMaterialsPerNode(mockNodes);

      // Verify findOneAndUpdate was called with upsert: true
      expect(mockAcademicDocument.findOneAndUpdate).toHaveBeenCalledWith(
        { url: 'https://doc.com', roadmapNodeId: 'node1' },
        expect.objectContaining({
          url: 'https://doc.com',
          roadmapNodeId: 'node1'
        }),
        { upsert: true, new: true }
      );
    });

    it('should mark all documents as visible', async () => {
      const mockNodes = [{ _id: 'node1', courseName: 'Course' }];
      mockNodesCatalog.getActiveRoadmapNodes.mockResolvedValue(mockNodes);

      mockTavily.academicSearch.mockResolvedValue([
        { title: 'Doc', url: 'https://doc.com', snippet: 'content', source: 'source' }
      ]);

      mockAcademicDocument.findOneAndUpdate.mockResolvedValue({ _id: 'doc1' });

      await academicFinder.crawlAcademicMaterialsPerNode(mockNodes);

      // Verify all documents are marked as visible
      expect(mockAcademicDocument.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          isVisible: true,
          inferenceConfidence: null
        }),
        expect.any(Object)
      );
    });
  });
});
