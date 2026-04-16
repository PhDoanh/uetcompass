'use strict';

jest.mock('../../../src/modules/roadmap/manualRoadmap.service', () => ({
    listPublic: jest.fn(),
    getPublicPreviewById: jest.fn(),
}));

const manualRoadmapService = require('../../../src/modules/roadmap/manualRoadmap.service');
const { listPublicManualRoadmaps } = require('../../../src/modules/roadmap/roadmap.controller');

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

describe('roadmap search api controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('rejects 1-character queries with validation error', async () => {
        const req = { query: { q: 'a' } };
        const res = mockRes();

        await listPublicManualRoadmaps(req, res);

        expect(manualRoadmapService.listPublic).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
        expect(res.jsonBody.error.code).toBe('INVALID_PAYLOAD');
    });

    test('forwards normalized query to service and returns data', async () => {
        manualRoadmapService.listPublic.mockResolvedValue({
            items: [
                { _id: 'r1', title: 'Frontend Roadmap', description: 'Learn frontend' },
            ],
            pagination: { page: 1, limit: 20, total: 1 },
        });

        const req = { query: { q: '  Frontend  ', page: '1', limit: '20' } };
        const res = mockRes();

        await listPublicManualRoadmaps(req, res);

        expect(manualRoadmapService.listPublic).toHaveBeenCalledWith({ q: 'Frontend', page: 1, limit: 20 });
        expect(res.statusCode).toBe(200);
        expect(res.jsonBody.items).toHaveLength(1);
    });
});
