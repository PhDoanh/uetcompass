jest.mock('../../../src/modules/progress/progress.service', () => ({
  getAll: jest.fn(),
  getRoadmapDetail: jest.fn(),
}));

const progressService = require('../../../src/modules/progress/progress.service');
const controller = require('../../../src/modules/progress/progress.controller');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };
}

describe('progress.controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getSummaries returns roadmaps payload', async () => {
    progressService.getAll.mockResolvedValue([{ roadmapId: 'r1' }]);

    const req = { user: { userId: 'u1' } };
    const res = createRes();

    await controller.getSummaries(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ roadmaps: [{ roadmapId: 'r1' }] });
  });

  test('getRoadmapNodes maps service errors to error envelope', async () => {
    const err = new Error('No access');
    err.status = 403;
    err.code = 'FORBIDDEN';
    progressService.getRoadmapDetail.mockRejectedValue(err);

    const req = { user: { userId: 'u1' }, params: { roadmapId: 'r1' } };
    const res = createRes();

    await controller.getRoadmapNodes(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'No access',
      },
    });
  });
});
