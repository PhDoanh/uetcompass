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

    mockTavily = require('../adapters/tavily.adapter');
    mockAcademicDocument = require('../models/academicDocument.model');
    mockNodesCatalog = require('../services/nodesCatalog.service');

    academicFinder = require('../services/academicFinder.service');
  });

  afterEach(() => {
    jest.dontMock('../adapters/tavily.adapter');
    jest.dontMock('../models/academicDocument.model');
    jest.dontMock('../services/nodesCatalog.service');
  });

  describe('classifySourceType', () => {
    it('should classify UET official URLs', () => {
      const result1 = academicFinder.classifySourceType('https://uet.vnu.edu.vn/slides.pdf');
      expect(result1).toBe('uet_official');

      const result2 = academicFinder.classifySourceType('https://github.com/uet-dev/web-course');
      expect(result2).toBe('uet_official');
    });

    it('should classify GitHub URLs', () => {
      const result = academicFinder.classifySourceType('https://github.com/someuser/web-tutorial');
      expect(result).toBe('github');
    });

    it('should classify external URLs', () => {
      const result = academicFinder.classifySourceType('https://example.com/lecture-notes.pdf');
      expect(result).toBe('external');
    });
  });

  describe('detectDocumentType', () => {
    it('should detect slide documents', () => {
      const result1 = academicFinder.detectDocumentType('https://course.com/slides.pptx', 'Chapter 1 Slides');
      expect(result1).toBe('slide');

      const result2 = academicFinder.detectDocumentType('https://course.com/presentation.key', 'Part 2');
      expect(result2).toBe('slide');
    });

    it('should detect lecture notes', () => {
      const result = academicFinder.detectDocumentType('https://course.com/notes.pdf', 'Lecture Notes Week 1');
      expect(result).toBe('lecture_note');
    });

    it('should detect syllabus documents', () => {
      const result1 = academicFinder.detectDocumentType('https://course.com/syllabus.pdf', 'Course Syllabus');
      expect(result1).toBe('syllabus');

      const result2 = academicFinder.detectDocumentType('https://course.com/giáo_trình.pdf', 'Giáo trình môn học');
      expect(result2).toBe('syllabus');
    });

    it('should detect exercise/homework documents', () => {
      const result = academicFinder.detectDocumentType('https://course.com/homework.zip', 'Bài tập tuần 3');
      expect(result).toBe('exercise');
    });

    it('should detect code samples', () => {
      const result = academicFinder.detectDocumentType('https://github.com/course/examples', 'Example code');
      expect(result).toBe('code_sample');
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
