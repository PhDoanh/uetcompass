import { loadManualProgress } from './manualProgress.utils';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import { getRoadmapNodes } from '../../services/progress.api';

jest.mock('../manual-roadmap/manualRoadmap.api', () => ({
  __esModule: true,
  default: {
    listManualRoadmaps: jest.fn(),
    getPublicManualRoadmapPreviewById: jest.fn(),
  },
}));

jest.mock('../../services/progress.api', () => ({
  getRoadmapNodes: jest.fn(),
}));

describe('loadManualProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates repeated roadmap ids before building summaries', async () => {
    manualRoadmapApi.listManualRoadmaps.mockResolvedValueOnce({
      items: [
        { _id: 'manual-1', title: 'Manual One', sharedAt: '2026-05-01T00:00:00.000Z' },
        { _id: 'manual-1', title: 'Manual One Duplicate', sharedAt: '2026-05-01T00:00:00.000Z' },
      ],
    });
    getRoadmapNodes.mockRejectedValue(new Error('no progress'));
    manualRoadmapApi.getPublicManualRoadmapPreviewById.mockResolvedValue({ nodes: [] });

    const result = await loadManualProgress('token');

    expect(result.summaries).toHaveLength(1);
    expect(result.summaries[0].roadmapId).toBe('manual-1');
    expect(Object.keys(result.detailsById)).toEqual(['manual-1']);
    expect(manualRoadmapApi.listManualRoadmaps).toHaveBeenCalledTimes(1);
  });
});