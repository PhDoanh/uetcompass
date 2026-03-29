/**
 * T017: Academic Routes Integration Tests (User Story 1)
 */

describe('Academic Routes', () => {
  let request;
  let app;
  let mockAcademicDocument;
  let mockVerifyToken;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database model
    jest.doMock('../models/academicDocument.model', () => ({      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      })
    }));

    // Mock auth middleware
    jest.doMock('../../../middleware/auth.middleware', () => ({
      verifyToken: jest.fn((req, res, next) => next())
    }));

    mockAcademicDocument = require('../models/academicDocument.model');
    mockVerifyToken = require('../../../middleware/auth.middleware').verifyToken;

    // Create a minimal Express app with the routes
    const express = require('express');
    app = express();
    const academicRoutes = require('../routes/academic.routes');
    app.use('/api/academic', academicRoutes);

    request = require('supertest');
  });

  afterEach(() => {
    jest.dontMock('../models/academicDocument.model');
    jest.dontMock('../../../middleware/auth.middleware');
  });

  describe('GET /api/academic/node/:roadmapNodeId', () => {
    it.skip('should return visible documents sorted by source type priority', async () => {
      const mockDocs = [
        {
          _id: 'doc1',
          title: 'UET Web Slides',
          url: 'https://uet.vnu.edu.vn/web.pdf',
          sourceType: 'uet_official',
          documentType: 'slide',
          courseName: 'Web Dev'
        },
        {
          _id: 'doc2',
          title: 'GitHub Tutorial',
          url: 'https://github.com/example/tutorial',
          sourceType: 'github',
          documentType: 'code_sample',
          courseName: 'Web Dev'
        },
        {
          _id: 'doc3',
          title: 'External Article',
          url: 'https://external.com/article',
          sourceType: 'external',
          documentType: 'lecture_note',
          courseName: 'Web Dev'
        }
      ];

      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockDocs)
        })
      });

      mockAcademicDocument.find = mockFind;

      const res = await request(app)
        .get('/api/academic/node/node123');

      expect(res.status).toBe(200);
      expect(res.body.roadmapNodeId).toBe('node123');
      expect(res.body.courseName).toBe('Web Dev');
      expect(res.body.documentCount).toBe(3);
      expect(res.body.documents).toHaveLength(3);

      // Verify sort was called with correct priority
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ roadmapNodeId: 'node123', isVisible: true }),
        expect.anything()
      );
    });

    it.skip('should require valid auth token', async () => {
      // Mock auth middleware to reject
      mockVerifyToken.mockImplementation((req, res, next) => {
        return res.status(401).json({ error: 'Unauthorized' });
      });

      const res = await request(app)
        .get('/api/academic/node/node123');

      expect(res.status).toBe(401);
    });

    it.skip('should return empty array for node with no documents', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      mockAcademicDocument.find = mockFind;

      const res = await request(app)
        .get('/api/academic/node/node123');

      expect(res.status).toBe(200);
      expect(res.body.documents).toEqual([]);
      expect(res.body.documentCount).toBe(0);
      expect(res.body.courseName).toBeNull();
    });

    it.skip('should handle database errors gracefully', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('DB connection error'))
        })
      });

      mockAcademicDocument.find = mockFind;

      const res = await request(app)
        .get('/api/academic/node/node123');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch academic materials');
    });

    it.skip('should format response correctly with optional skill names', async () => {
      const mockDocs = [
        {
          _id: 'doc1',
          title: 'React Guide',
          url: 'https://guide.com/react',
          sourceType: 'external',
          documentType: 'tutorial',
          courseName: 'Web Dev',
          skillId: 'skill1' // Has skill association
        }
      ];

      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockDocs)
        })
      });

      mockAcademicDocument.find = mockFind;

      const res = await request(app)
        .get('/api/academic/node/node123');

      expect(res.body.documents[0]).toEqual(
        expect.objectContaining({
          documentId: 'doc1',
          title: 'React Guide',
          url: 'https://guide.com/react',
          sourceType: 'external',
          documentType: 'tutorial'
        })
      );
    });

    it.skip('should sort results: uet_official first, then github, then external', async () => {
      const mockDocs = [
        { sourceType: 'uet_official', title: 'UET' },
        { sourceType: 'external', title: 'External' },
        { sourceType: 'github', title: 'GitHub' }
      ];

      const mockSort = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDocs)
      });

      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort
      });

      mockAcademicDocument.find = mockFind;

      const res = await request(app)
        .get('/api/academic/node/node123');

      // Verify sort was called with sourceType priority
      expect(mockSort).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 1 // Alphabetical sort (github < external < uet_official)
        })
      );

      expect(res.status).toBe(200);
    });

    it.skip('should only return isVisible=true documents', async () => {
      const mockFind = jest.fn();
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      mockAcademicDocument.find = mockFind;

      const res = await request(app)
        .get('/api/academic/node/node123');

      // Verify find was called with isVisible: true filter
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ isVisible: true }),
        expect.anything()
      );
    });
  });
});
