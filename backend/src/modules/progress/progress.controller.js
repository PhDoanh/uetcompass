'use strict';

const progressService = require('./progress.service');
const progressTrackingService = require('./progress.tracking.service');
const progressSse = require('./progress.sse');
const { verifyAccessToken } = require('../auth/token.service');

function sendError(res, err) {
  const status = err?.status || 500;
  const code = err?.code || 'INTERNAL_ERROR';
  const message = err?.message || 'Unexpected server error';
  const details = err?.details;

  const payload = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    payload.error.details = details;
  }

  res.status(status).json(payload);
}

async function getSummaries(req, res) {
  try {
    const userId = req.user.userId;
    const roadmaps = await progressService.getAll(userId);
    return res.status(200).json({ roadmaps });
  } catch (err) {
    return sendError(res, err);
  }
}

async function getRoadmapNodes(req, res) {
  try {
    const userId = req.user.userId;
    const { roadmapId } = req.params;
    const detail = await progressService.getRoadmapDetail(userId, roadmapId);
    return res.status(200).json(detail);
  } catch (err) {
    return sendError(res, err);
  }
}

async function getTrackingTables(req, res) {
  try {
    const userId = req.user.userId;
    const { scope, roadmapId, groupBy } = req.query || {};
    const result = await progressTrackingService.getTrackingTables(userId, { scope, roadmapId, groupBy });
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
}

function streamProgressEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sseToken = req.query?.sseToken;
  if (!sseToken || typeof sseToken !== 'string') {
    res.write('event: error\\n');
    res.write('data: {"code":"UNAUTHORIZED","message":"Invalid or missing sseToken"}\\n\\n');
    res.end();
    return;
  }

  let userId;
  try {
    const payload = verifyAccessToken(sseToken.trim());
    userId = String(payload?.userId || '').trim();
  } catch {
    userId = '';
  }

  if (!userId) {
    res.write('event: error\n');
    res.write('data: {"code":"UNAUTHORIZED","message":"Invalid or missing sseToken"}\n\n');
    res.end();
    return;
  }

  res.write(': ok\\n\\n');
  progressSse.addClient(userId, res);
}

module.exports = {
  getSummaries,
  getRoadmapNodes,
  getTrackingTables,
  streamProgressEvents,
};
