'use strict';

jest.mock('../../src/modules/roadmap/manualRoadmap.service', () => ({
	listPublic: jest.fn(),
	getPublicPreviewById: jest.fn(),
}));

jest.mock('../../src/modules/roadmap/roadmapComment.service', () => ({
	listByRoadmapId: jest.fn(),
}));

const manualRoadmapService = require('../../src/modules/roadmap/manualRoadmap.service');
const roadmapCommentService = require('../../src/modules/roadmap/roadmapComment.service');
const { listPublicManualRoadmaps, getPublicManualRoadmapPreviewById } = require('../../src/modules/roadmap/roadmap.controller');

function mockRes() {
	return {
		statusCode: 200,
		jsonBody: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(body) {
			this.jsonBody = body;
			return this;
		},
	};
}

describe('roadmap search preview controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns preview data by id', async () => {
		manualRoadmapService.getPublicPreviewById.mockResolvedValue({
			_id: 'roadmap-1',
			title: 'Frontend Roadmap',
			description: 'Preview',
			nodes: [{ nodeId: 'A', label: 'Alpha' }],
		});
		roadmapCommentService.listByRoadmapId.mockResolvedValue({
			items: [{ id: 'comment-1', author: 'Bạn', rating: 5, content: 'Great roadmap', date: '28/04/2026 10:00' }],
			pagination: { page: 1, limit: 10, total: 1 },
		});

		const req = { params: { roadmapId: 'roadmap-1' } };
		const res = mockRes();

		await getPublicManualRoadmapPreviewById(req, res);

		expect(manualRoadmapService.getPublicPreviewById).toHaveBeenCalledWith('roadmap-1');
		expect(roadmapCommentService.listByRoadmapId).toHaveBeenCalledWith('roadmap-1', { limit: 10 });
		expect(res.statusCode).toBe(200);
		expect(res.jsonBody.title).toBe('Frontend Roadmap');
		expect(res.jsonBody.reviews).toHaveLength(1);
	});

	test('returns not found when preview id is missing', async () => {
		manualRoadmapService.getPublicPreviewById.mockResolvedValue(null);

		const req = { params: { roadmapId: 'missing' } };
		const res = mockRes();

		await getPublicManualRoadmapPreviewById(req, res);

		expect(res.statusCode).toBe(404);
		expect(res.jsonBody.error.code).toBe('ROADMAP_NOT_FOUND');
	});

	test('forwards public list query to service', async () => {
		manualRoadmapService.listPublic.mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0 } });

		const req = { query: { q: 'web', page: '1', limit: '20' } };
		const res = mockRes();

		await listPublicManualRoadmaps(req, res);

		expect(manualRoadmapService.listPublic).toHaveBeenCalledWith({ q: 'web', page: 1, limit: 20 });
		expect(res.statusCode).toBe(200);
		expect(res.jsonBody.pagination.total).toBe(0);
	});
});
