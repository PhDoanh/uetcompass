const progressSse = require('../../../src/modules/progress/progress.sse');

describe('progress.sse', () => {
  test('addClient + notifyUser sends event payload', () => {
    const writes = [];
    const res = {
      write: (value) => writes.push(value),
      on: jest.fn(),
    };

    progressSse.addClient('u1', res);
    const sent = progressSse.notifyUser('u1', { roadmapId: 'r1' }, 'progress:updated');

    expect(sent).toBe(true);
    expect(writes.some((line) => line.includes('event: progress:updated'))).toBe(true);
    expect(writes.some((line) => line.includes('roadmapId'))).toBe(true);

    progressSse.removeClient('u1', res);
  });

  test('notifyUser returns false when no clients', () => {
    expect(progressSse.notifyUser('missing-user', { ok: true })).toBe(false);
  });
});
