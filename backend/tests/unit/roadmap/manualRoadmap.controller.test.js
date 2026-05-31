'use strict';

jest.mock('../../../src/modules/roadmap/manualRoadmap.service', () => ({
	listByUser: jest.fn(),
}));

const manualRoadmapService = require('../../../src/modules/roadmap/manualRoadmap.service');
const { listManualRoadmaps } = require('../../../src/modules/roadmap/roadmap.controller');

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

describe('manual roadmap controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('lists authenticated user manual roadmaps', async () => {
		manualRoadmapService.listByUser.mockResolvedValue({
			items: [{ _id: 'manual-1', title: 'My roadmap' }],
			pagination: { page: 1, limit: 5, total: 1 },
		});

		const req = { user: { userId: 'user-1' }, query: { page: '1', limit: '5' } };
		const res = mockRes();

		await listManualRoadmaps(req, res);

		expect(manualRoadmapService.listByUser).toHaveBeenCalledWith('user-1', { page: 1, limit: 5 });
		expect(res.statusCode).toBe(200);
		expect(res.jsonBody.pagination.total).toBe(1);
	});
});