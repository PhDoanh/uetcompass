import { useEffect } from 'react';
import { buildProgressSseUrl } from '../../services/progress.api';

function getRoadmapKey(item) {
  const roadmapId = String(item?.roadmapId || '').trim();
  if (!roadmapId) {
    return '';
  }

  const roadmapSource = String(item?.roadmapSource || (item?.isManual ? 'manual' : item?.isPrimary ? 'primary' : 'roadmap') || '').trim() || 'roadmap';
  return item?.roadmapKey || `${roadmapSource}:${roadmapId}`;
}

export function mergeSummaryIntoRoadmaps(currentRoadmaps, incomingSummary) {
  const list = Array.isArray(currentRoadmaps) ? currentRoadmaps : [];
  const next = incomingSummary || null;
  const nextKey = getRoadmapKey(next);
  if (!nextKey) {
    return list;
  }

  const index = list.findIndex((item) => getRoadmapKey(item) === nextKey);
  if (index < 0) {
    return [{ ...next, roadmapKey: nextKey }, ...list];
  }

  const updated = list.slice();
  updated[index] = { ...updated[index], ...next, roadmapKey: nextKey };
  return updated;
}

export default function useProgressSSE({ sseToken, onSummaryUpdated, onUnauthorized }) {
  useEffect(() => {
    if (!sseToken) {
      return undefined;
    }

    const source = new EventSource(buildProgressSseUrl(sseToken));

    source.addEventListener('progress:updated', (event) => {
      try {
        const summary = JSON.parse(event.data);
        onSummaryUpdated?.(summary);
      } catch (_) {
        // Ignore malformed event payloads.
      }
    });

    source.addEventListener('error', (event) => {
      try {
        if (!event?.data) {
          return;
        }
        const payload = JSON.parse(event.data);
        if (payload?.code === 'UNAUTHORIZED') {
          source.close();
          onUnauthorized?.();
        }
      } catch (_) {
        // Network-level EventSource errors are auto-retried by browser.
      }
    });

    return () => {
      source.close();
    };
  }, [sseToken, onSummaryUpdated, onUnauthorized]);
}
