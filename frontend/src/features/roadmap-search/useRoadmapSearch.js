import { useEffect, useMemo, useRef, useState } from 'react';
import roadmapSearchApi from '../../services/roadmapSearch.api';
import { canSearchRoadmaps, getInitialSelectedRoadmapId, normalizeRoadmapQuery } from './roadmapSearch.logic';

const DEBOUNCE_MS = 300;

export function useRoadmapSearch(initialQuery = '') {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [selectedRoadmapId, setSelectedRoadmapId] = useState(null);
    const [resultsStatus, setResultsStatus] = useState('idle');
    const [previewStatus, setPreviewStatus] = useState('idle');
    const [previewData, setPreviewData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const requestRef = useRef(0);

    const normalizedQuery = useMemo(() => normalizeRoadmapQuery(query), [query]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const initialUrlQuery = String(params.get('q') || '').trim();
        if (initialUrlQuery) {
            setQuery(initialUrlQuery);
        }

        const handleNavbarQuery = (event) => {
            const nextQuery = String(event?.detail?.query || '');
            setQuery(nextQuery);
        };

        window.addEventListener('roadmap-search-query', handleNavbarQuery);

        return () => {
            window.removeEventListener('roadmap-search-query', handleNavbarQuery);
        };
    }, []);

    useEffect(() => {
        if (normalizedQuery.length === 0) {
            setResults([]);
            setSelectedRoadmapId(null);
            setResultsStatus('idle');
            setPreviewStatus('idle');
            setPreviewData(null);
            setErrorMessage('');
            return;
        }

        if (!canSearchRoadmaps(normalizedQuery)) {
            setResults([]);
            setSelectedRoadmapId(null);
            setResultsStatus('idle');
            setPreviewStatus('idle');
            setPreviewData(null);
            setErrorMessage('Type at least 2 characters to search.');
            return;
        }

        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setResultsStatus('searching');
        setErrorMessage('');

        const timer = window.setTimeout(async () => {
            try {
                const payload = await roadmapSearchApi.searchPublicRoadmaps({ q: normalizedQuery, page: 1, limit: 20 });
                if (requestRef.current !== requestId) {
                    return;
                }

                const nextResults = Array.isArray(payload?.items) ? payload.items : [];
                setResults(nextResults);

                if (nextResults.length === 0) {
                    setSelectedRoadmapId(null);
                    setPreviewStatus('idle');
                    setPreviewData(null);
                    setResultsStatus('empty');
                    return;
                }

                setSelectedRoadmapId(getInitialSelectedRoadmapId(nextResults));
                setResultsStatus('loaded');
            } catch (error) {
                if (requestRef.current !== requestId) {
                    return;
                }
                setResults([]);
                setSelectedRoadmapId(null);
                setPreviewStatus('idle');
                setPreviewData(null);
                setResultsStatus('error');
                setErrorMessage(error.message || 'Unable to search roadmaps.');
            }
        }, DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [normalizedQuery]);

    useEffect(() => {
        if (!selectedRoadmapId) {
            return;
        }

        let isActive = true;
        setPreviewStatus('loading');
        setErrorMessage('');

        (async () => {
            try {
                const payload = await roadmapSearchApi.getPublicRoadmapPreviewById(selectedRoadmapId);
                if (!isActive) {
                    return;
                }
                setPreviewData(payload);
                setPreviewStatus('loaded');
            } catch (error) {
                if (!isActive) {
                    return;
                }
                setPreviewData(null);
                setPreviewStatus('error');
                setErrorMessage(error.message || 'Unable to load roadmap preview.');
            }
        })();

        return () => {
            isActive = false;
        };
    }, [selectedRoadmapId]);

    return {
        query,
        setQuery,
        results,
        selectedRoadmapId,
        setSelectedRoadmapId,
        resultsStatus,
        previewStatus,
        previewData,
        errorMessage,
    };
}
