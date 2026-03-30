import { useEffect } from 'react';
import { buildProgressSseUrl } from '../../services/progress.api';

export function mergeSummaryIntoRoadmaps(currentRoadmaps, incomingSummary) {
  const list = Array.isArray(currentRoadmaps) ? currentRoadmaps : [];
  const next = incomingSummary || null;
  if (!next?.roadmapId) {
    return list;
  }

  const index = list.findIndex((item) => item.roadmapId === next.roadmapId);
  if (index < 0) {
    return [next, ...list];
  }

  const updated = list.slice();
  updated[index] = { ...updated[index], ...next };
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
