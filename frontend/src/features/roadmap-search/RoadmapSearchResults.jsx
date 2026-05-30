/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Star } from 'lucide-react';

import {
    ROADMAP_SEARCH_RESULTS_PAGE_SIZE,
    clampRoadmapResultsStartIndex,
    getPagedRoadmapResults,
    getRoadmapResultsWindowStartIndex,
} from './roadmapSearch.logic';



const MAX_VISIBLE_TAGS = 4;



function formatRating(value) {

    if (typeof value !== 'number' || !Number.isFinite(value)) {

        return null;

    }

    return value.toFixed(1);

}



function resolveNodeCount(result) {

    if (Array.isArray(result?.nodeDetails) && result.nodeDetails.length > 0) {

        return result.nodeDetails.length;

    }

    if (typeof result?.nodeCount === 'number' && Number.isFinite(result.nodeCount)) {

        return result.nodeCount;

    }

    if (Array.isArray(result?.nodes)) {

        return result.nodes.length;

    }

    return 0;

}



function resolveOwnershipLabel(result, currentUserId) {

    const ownerId = String(result?.userId || '').trim();

    const viewerId = String(currentUserId || '').trim();

    if (ownerId && viewerId && ownerId === viewerId) {

        return 'Lộ trình bạn sở hữu';

    }

    return 'Chia sẻ bởi cộng đồng';

}



export default function RoadmapSearchResults({

    results = [],

    resultsStatus = 'idle',

    selectedRoadmapId = null,

    onSelectResult,

    currentUserId = null,

}) {

    const listRef = useRef(null);
    const wheelResetTimerRef = useRef(null);
    const [pageStartIndex, setPageStartIndex] = useState(0);

    const visibleResults = useMemo(
        () => getPagedRoadmapResults(results, pageStartIndex, ROADMAP_SEARCH_RESULTS_PAGE_SIZE),
        [pageStartIndex, results]
    );

    useEffect(() => {
        setPageStartIndex(0);
    }, [results]);

    useEffect(() => {
        if (!selectedRoadmapId) {
            return;
        }

        const nextStartIndex = getRoadmapResultsWindowStartIndex(
            results,
            selectedRoadmapId,
            ROADMAP_SEARCH_RESULTS_PAGE_SIZE
        );

        setPageStartIndex((currentStartIndex) =>
            currentStartIndex === nextStartIndex ? currentStartIndex : nextStartIndex
        );
    }, [results, selectedRoadmapId]);

    useEffect(
        () => () => {
            if (wheelResetTimerRef.current) {
                clearTimeout(wheelResetTimerRef.current);
            }
        },
        []
    );

    useEffect(() => {
        if (!selectedRoadmapId || !listRef.current) {

            return;

        }

        const id = String(selectedRoadmapId);

        const card = Array.from(listRef.current.querySelectorAll('[data-result-id]')).find(

            (el) => el.getAttribute('data-result-id') === id
        );

        card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    }, [selectedRoadmapId, visibleResults]);

    function handleWheel(event) {
        if (results.length <= ROADMAP_SEARCH_RESULTS_PAGE_SIZE || event.deltaY === 0) {

            return;

        }

        if (wheelResetTimerRef.current) {

            return;

        }

        event.preventDefault();

        const direction = event.deltaY > 0 ? 1 : -1;

        setPageStartIndex((currentStartIndex) => {
            const nextStartIndex = currentStartIndex + direction * ROADMAP_SEARCH_RESULTS_PAGE_SIZE;
            return clampRoadmapResultsStartIndex(
                nextStartIndex,
                results.length,
                ROADMAP_SEARCH_RESULTS_PAGE_SIZE
            );
        });

        wheelResetTimerRef.current = setTimeout(() => {
            wheelResetTimerRef.current = null;
        }, 140);
    }

    if (resultsStatus === 'searching') {

        return <p className="roadmap-search-results__state">Đang tìm lộ trình...</p>;

    }



    if (resultsStatus === 'error') {

        return (

            <p className="roadmap-search-results__state roadmap-search-results__state--error">

                Không tìm được. Vui lòng thử lại.

            </p>

        );

    }



    if (resultsStatus === 'empty') {

        return <p className="roadmap-search-results__state">Không có lộ trình phù hợp.</p>;

    }



    return (

        <div className="roadmap-search-results" aria-label="Kết quả tìm kiếm lộ trình">

            {results.length === 0 ? (

                <p className="roadmap-search-results__state">

                    Nhập ít nhất 2 ký tự tên hoặc gõ # để thêm tag.

                </p>

            ) : (

                <div
                    ref={listRef}
                    className="roadmap-search-results__list"
                    role="listbox"
                    aria-label="Danh sách lộ trình"
                    onWheel={handleWheel}
                >

                    {visibleResults.map((result) => {

                        const isSelected = result._id === selectedRoadmapId;

                        const tags = Array.isArray(result.tags) ? result.tags : [];

                        const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);

                        const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);

                        const rating = formatRating(result.averageRating);

                        const nodeCount = resolveNodeCount(result);



                        return (

                            <button

                                key={result._id}

                                type="button"

                                role="option"

                                aria-selected={isSelected}

                                data-result-id={result._id}

                                className={`roadmap-search-results__card ${isSelected ? 'is-selected' : ''}`}

                                onClick={() => onSelectResult?.(result._id)}

                            >

                                <div className="roadmap-search-results__card-top">

                                    {visibleTags.length > 0 ? (

                                        <div className="roadmap-search-results__tags" aria-label="Tags">

                                            {visibleTags.map((tag, index) => (

                                                <span

                                                    key={String(tag.normalizedLabel || tag.label || index)}

                                                    className={`roadmap-search-results__tag${index === 0 ? ' roadmap-search-results__tag--primary' : ''}`}

                                                >

                                                    {tag.label || tag.normalizedLabel}

                                                </span>

                                            ))}

                                            {hiddenTagCount > 0 ? (

                                                <span className="roadmap-search-results__tag roadmap-search-results__tag--more">

                                                    +{hiddenTagCount}

                                                </span>

                                            ) : null}

                                        </div>

                                    ) : (

                                        <span className="roadmap-search-results__tags-placeholder" />

                                    )}

                                    {rating ? (

                                        <span className="roadmap-search-results__rating" aria-label={`Đánh giá ${rating}`}>

                                            <span>{rating}</span>

                                            <Star size={14} aria-hidden="true" className="roadmap-search-results__rating-icon" />

                                        </span>

                                    ) : null}

                                </div>

                                <strong className="roadmap-search-results__card-title">{result.title}</strong>

                                <p className="roadmap-search-results__card-description">

                                    {result.description || 'Chưa có mô tả.'}

                                </p>

                                <div className="roadmap-search-results__card-footer">

                                    <span className="roadmap-search-results__meta">

                                        {nodeCount > 0 ? `${nodeCount} nút` : 'Chưa có nút'}

                                    </span>

                                    <span className="roadmap-search-results__shared">

                                        {resolveOwnershipLabel(result, currentUserId)}

                                    </span>

                                </div>

                            </button>

                        );

                    })}

                </div>

            )}

        </div>

    );

}


