import { useEffect, useMemo, useRef, useState } from 'react';
import roadmapSearchApi from '../../services/roadmapSearch.api';
import {
    getInitialSelectedRoadmapId,
    normalizeRoadmapQuery,
    selectedTagsSignature,
    shouldRunRoadmapSearch,
} from './roadmapSearch.logic';

const DEBOUNCE_MS = 300;

export function useRoadmapSearch(initialQuery = '') {
    const [nameQuery, setNameQuery] = useState(initialQuery);
    const [selectedTags, setSelectedTags] = useState([]);
    const [results, setResults] = useState([]);
    const [selectedRoadmapId, setSelectedRoadmapId] = useState(null);
    const [resultsStatus, setResultsStatus] = useState('idle');
    const [previewStatus, setPreviewStatus] = useState('idle');
    const [previewData, setPreviewData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const requestRef = useRef(0);

    const normalizedNameQuery = useMemo(() => normalizeRoadmapQuery(nameQuery), [nameQuery]);
    const tagsKey = useMemo(() => selectedTagsSignature(selectedTags), [selectedTags]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const initialUrlQuery = String(params.get('q') || '').trim();
        if (initialUrlQuery) {
            setNameQuery(initialUrlQuery);
        }

        const handleNavbarQuery = (event) => {
            const nextQuery = String(event?.detail?.query || '');
            setNameQuery(nextQuery);
        };

        window.addEventListener('roadmap-search-query', handleNavbarQuery);

        return () => {
            window.removeEventListener('roadmap-search-query', handleNavbarQuery);
        };
    }, []);

    useEffect(() => {
        const q = normalizedNameQuery;
        const hasTags = Array.isArray(selectedTags) && selectedTags.length > 0;

        if (q.length === 0 && !hasTags) {
            setResults([]);
            setSelectedRoadmapId(null);
            setResultsStatus('idle');
            setPreviewStatus('idle');
            setPreviewData(null);
            setErrorMessage('');
            return;
        }

        if (!shouldRunRoadmapSearch(nameQuery, selectedTags)) {
            setResults([]);
            setSelectedRoadmapId(null);
            setResultsStatus('idle');
            setPreviewStatus('idle');
            setPreviewData(null);
            setErrorMessage('Nhập ít nhất 2 ký tự để tìm theo tên (hoặc chọn tag).');
            return;
        }

        const qParam = q.length >= 2 ? q : '';
        const tagsParam = Array.isArray(selectedTags)
            ? selectedTags.map((t) => String(t?.normalizedLabel || '').trim().toLowerCase()).filter(Boolean)
            : [];

        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setResultsStatus('searching');
        setErrorMessage('');

        const timer = window.setTimeout(async () => {
            try {
                const payload = await roadmapSearchApi.searchPublicRoadmaps({
                    q: qParam,
                    tags: tagsParam,
                    page: 1,
                    limit: 20,
                });
                if (requestRef.current !== requestId) {
                    return;
                }

                const nextResults = Array.isArray(payload?.items) ? payload.items : [];

                if (nextResults.length === 0) {
                    setResults([]);
                    setSelectedRoadmapId(null);
                    setPreviewStatus('idle');
                    setPreviewData(null);
                    setResultsStatus('empty');
                    return;
                }

                const details = await Promise.all(
                    nextResults.map(async (result) => {
                        try {
                            const preview = await roadmapSearchApi.getPublicRoadmapPreviewById(result._id);
                            return {
                                ...result,
                                nodeDetails: Array.isArray(preview?.nodes) ? preview.nodes : [],
                                description: String(preview?.description || result.description || '').trim(),
                            };
                        } catch {
                            return {
                                ...result,
                                nodeDetails: [],
                            };
                        }
                    })
                );

                if (requestRef.current !== requestId) {
                    return;
                }

                setResults(details);

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
    }, [normalizedNameQuery, tagsKey]);

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
        nameQuery,
        setNameQuery,
        selectedTags,
        setSelectedTags,
        /** @deprecated same as nameQuery — kept for callers using `query` */
        query: nameQuery,
        setQuery: setNameQuery,
        results,
        selectedRoadmapId,
        setSelectedRoadmapId,
        resultsStatus,
        previewStatus,
        previewData,
        errorMessage,
    };
}
