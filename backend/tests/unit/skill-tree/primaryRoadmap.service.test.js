'use strict';

jest.mock('../../../src/modules/roadmap/roadmap.service');

const roadmapService = require('../../../src/modules/roadmap/roadmap.service');
const primaryRoadmapService = require('../../../src/modules/skill-tree/primaryRoadmap.service');

describe('primaryRoadmap.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primaryRoadmapService.__resetMock();
  });

  test('falls back to retryable roadmap when primary roadmap does not exist', async () => {
    roadmapService.getPrimaryByUser.mockResolvedValue(null);
    roadmapService.getRetryableByUser.mockResolvedValue({
      _id: 'roadmap-retryable-id',
      userId: '507f1f77bcf86cd799439011',
      studentProfileId: '507f1f77bcf86cd799439012',
      personalisationLevel: 'low',
      roadmapName: 'Retryable Roadmap',
      nodes: [
        {
          nodeId: 'node-1',
          nodeType: 'topic',
          skillName: 'Foundations',
          parentNodeId: null,
          relatedCourses: [],
          reason: 'Start here',
          resources: [],
        },
      ],
      acceptedAt: null,
      isPrimary: false,
      createdAt: new Date('2026-04-11T10:00:00.000Z'),
      updatedAt: new Date('2026-04-11T10:05:00.000Z'),
    });

    const result = await primaryRoadmapService.getPrimaryRoadmap('507f1f77bcf86cd799439011');

    expect(roadmapService.getPrimaryByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(roadmapService.getRetryableByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(result.acceptedAt).toBeNull();
    expect(result.isPrimary).toBe(false);
    expect(result.nodes[0]).toMatchObject({
      nodeId: 'node-1',
      nodeType: 'topic',
      skillName: 'Foundations',
    });
  });

  test('throws ROADMAP_NOT_FOUND when neither primary nor retryable roadmap exists', async () => {
    roadmapService.getPrimaryByUser.mockResolvedValue(null);
    roadmapService.getRetryableByUser.mockResolvedValue(null);

    await expect(
      primaryRoadmapService.getPrimaryRoadmap('507f1f77bcf86cd799439011')
    ).rejects.toMatchObject({
      code: 'ROADMAP_NOT_FOUND',
      status: 404,
    });
  });
});
