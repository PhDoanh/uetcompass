import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import { getRoadmapNodes } from '../../services/progress.api';

const MANUAL_ROADMAP_FETCH_LIMIT = 100;
const MAX_MANUAL_ROADMAP_FETCH_PAGES = 30;

function dedupeByRoadmapId(items = []) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const roadmapId = String(item?._id || item?.roadmapId || '').trim();
    if (!roadmapId || seen.has(roadmapId)) {
      return;
    }

    seen.add(roadmapId);
    result.push(item);
  });

  return result;
}

function normalizeStatus(rawStatus) {
  const status = String(rawStatus || '').trim().toLowerCase();
  if (status === 'done' || status === 'completed') {
    return 'done';
  }
  if (status === 'in_progress' || status === 'inprogress') {
    return 'in_progress';
  }
  if (status === 'locked' || status === 'skip') {
    return 'pending';
  }
  return 'pending';
}

function buildDetailNodes(nodes = []) {
  const detail = {
    done: [],
    inProgress: [],
    pending: [],
  };

  nodes.forEach((node) => {
    const status = normalizeStatus(node?.status);
    const payload = {
      id: node?.nodeId || node?.id || node?.courseCode || '',
      nodeId: node?.nodeId || node?.id || '',
      name: node?.label || node?.skillName || node?.courseName || node?.nodeId || 'Unknown',
      courseCode: node?.courseCode || '',
      status,
    };

    if (status === 'done') {
      detail.done.push(payload);
    } else if (status === 'in_progress') {
      detail.inProgress.push(payload);
    } else {
      detail.pending.push(payload);
    }
  });

  return detail;
}

function buildManualSummaryFromDetail(roadmap, detail, hasProgressData) {
  const doneNodes = detail?.done?.length || 0;
  const inProgressNodes = detail?.inProgress?.length || 0;
  const pendingNodes = detail?.pending?.length || 0;
  const totalNodes = doneNodes + inProgressNodes + pendingNodes;
  const progressPercent = totalNodes ? Math.round((doneNodes / totalNodes) * 100) : 0;

  const roadmapId = String(roadmap?._id || '').trim();
  const roadmapName = String(roadmap?.title || roadmap?.roadmapName || 'Manual roadmap').trim();

  return {
    summary: {
      roadmapId,
      roadmapName,
      isPrimary: false,
      isManual: true,
      totalNodes,
      doneNodes,
      inProgressNodes,
      pendingNodes,
      progressPercent,
      roadmapCreatedAt: roadmap?.createdAt || roadmap?.updatedAt || null,
      roadmapAcceptedAt: roadmap?.sharedAt || null,
      lastActivityDate: roadmap?.updatedAt || null,
      manualHasProgressData: Boolean(hasProgressData),
    },
    detail: {
      roadmapId,
      roadmapName,
      nodes: detail,
      manualMissingData: !hasProgressData,
    },
  };
}

export function computeManualProgressTotals(summaries = []) {
  return summaries.reduce(
    (acc, summary) => {
      acc.totalNodes += summary?.totalNodes || 0;
      acc.doneNodes += summary?.doneNodes || 0;
      acc.inProgressNodes += summary?.inProgressNodes || 0;
      acc.pendingNodes += summary?.pendingNodes || 0;
      return acc;
    },
    {
      totalNodes: 0,
      doneNodes: 0,
      inProgressNodes: 0,
      pendingNodes: 0,
    }
  );
}

async function fetchAllManualRoadmaps(accessToken) {
  const items = [];

  for (let page = 1; page <= MAX_MANUAL_ROADMAP_FETCH_PAGES; page += 1) {
    const result = await manualRoadmapApi.listManualRoadmaps(accessToken, {
      page,
      limit: MANUAL_ROADMAP_FETCH_LIMIT,
    });

    const batch = Array.isArray(result?.items) ? result.items : [];
    items.push(...batch);

    if (batch.length < MANUAL_ROADMAP_FETCH_LIMIT) {
      break;
    }
  }

  return dedupeByRoadmapId(items);
}

export async function loadManualProgress(accessToken) {
  const manualRoadmaps = await fetchAllManualRoadmaps(accessToken);
  const detailsById = {};
  const summariesById = new Map();

  await Promise.all(
    manualRoadmaps.map(async (roadmap) => {
      const roadmapId = String(roadmap?._id || '').trim();
      if (!roadmapId) {
        return null;
      }

      let detail = null;
      let hasProgressData = false;

      try {
        const progressDetail = await getRoadmapNodes(accessToken, roadmapId);
        const progressNodes = progressDetail?.nodes || {};
        detail = {
          done: Array.isArray(progressNodes.done) ? progressNodes.done : [],
          inProgress: Array.isArray(progressNodes.inProgress) ? progressNodes.inProgress : [],
          pending: Array.isArray(progressNodes.pending) ? progressNodes.pending : [],
        };
        hasProgressData = detail.done.length + detail.inProgress.length + detail.pending.length > 0;
      } catch (_) {
        detail = null;
        hasProgressData = false;
      }

      if (!detail) {
        try {
          const preview = await manualRoadmapApi.getPublicManualRoadmapPreviewById(roadmapId);
          const nodes = Array.isArray(preview?.nodes) ? preview.nodes : [];
          detail = buildDetailNodes(nodes);
          hasProgressData = nodes.length > 0;
        } catch (_) {
          detail = { done: [], inProgress: [], pending: [] };
          hasProgressData = false;
        }
      }

      const summaryData = buildManualSummaryFromDetail(roadmap, detail, hasProgressData);
      const summary = summaryData.summary;
      const detailPayload = summaryData.detail;
      detailsById[roadmapId] = detailPayload;
      summariesById.set(roadmapId, summary);
      return summary;
    })
  );

  return {
    summaries: Array.from(summariesById.values()),
    detailsById,
  };
}
