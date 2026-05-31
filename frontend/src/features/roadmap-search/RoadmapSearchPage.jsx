import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import RoadmapSearchResults from './RoadmapSearchResults';

import RoadmapSearchQueryBar from './RoadmapSearchQueryBar';

import RoadmapPreviewPanel from './RoadmapPreviewPanel';

import roadmapSearchApi from '../../services/roadmapSearch.api';

import { useAuth } from '../../providers/AuthProvider';

import { useRoadmapSearch } from './useRoadmapSearch';



export const ROADMAP_SEARCH_PLACEHOLDER =

    "Nhập lộ trình bạn muốn tìm kiếm. Ví dụ: 'Backend Engineer #advanced #deploy #AI'";

export const ROADMAP_SEARCH_DEBOUNCE_MS = 300;

export const ROADMAP_SEARCH_MIN_LENGTH = 2;



function resolveUserId(accessToken) {

    if (!accessToken || typeof accessToken !== 'string') {

        return null;

    }

    try {

        const payloadPart = accessToken.split('.')[1];

        if (!payloadPart) {

            return null;

        }

        const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));

        return String(payload?.userId || payload?.sub || '').trim() || null;

    } catch {

        return null;

    }

}



export default function RoadmapSearchPage() {

    const { accessToken } = useAuth();

    const queryAnchorRef = useRef(null);

    const queryInputRef = useRef(null);

    const lastSortedResultsSignatureRef = useRef('');

    const [hasSearchContent, setHasSearchContent] = useState(false);

    const [availableTags, setAvailableTags] = useState([]);

    const [sortAscending, setSortAscending] = useState(true);

    const currentUserId = useMemo(() => resolveUserId(accessToken), [accessToken]);

    const {

        nameQuery,

        setNameQuery,

        selectedTags,

        setSelectedTags,

        results,

        selectedRoadmapId,

        setSelectedRoadmapId,

        resultsStatus,

        previewStatus,

        previewData,

        errorMessage,

    } = useRoadmapSearch('');



    useEffect(() => {

        let cancelled = false;

        roadmapSearchApi

            .getManualRoadmapTags()

            .then((tags) => {

                if (!cancelled && Array.isArray(tags)) {

                    setAvailableTags(tags);

                }

            })

            .catch(() => { });

        return () => {

            cancelled = true;

        };

    }, []);



    useLayoutEffect(() => {

        const anchor = queryAnchorRef.current;

        const input = queryInputRef.current;

        if (anchor && typeof anchor.scrollIntoView === 'function') {

            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });

        }

        if (input && typeof input.focus === 'function') {

            input.focus({ preventScroll: true });

        }

    }, []);



    useEffect(() => {

        /** Bỏ qua điều hướng kết quả: ô tag sau #, textarea/select, hoặc nút trong dropdown gợi ý tag. */

        function shouldSkipResultArrowNav(el) {

            if (!el || !(el instanceof HTMLElement)) {

                return true;

            }

            if (el.isContentEditable) {

                return true;

            }

            const tag = el.tagName;

            if (tag === 'TEXTAREA' || tag === 'SELECT') {

                return true;

            }

            if (tag === 'INPUT') {

                if (el.classList.contains('roadmap-search-query-bar__tag-input')) {

                    return true;

                }

                if (el.getAttribute('name') === 'roadmap-search-tag-draft') {

                    return true;

                }

            }

            return false;

        }



        function onKeyDown(e) {

            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {

                return;

            }

            const target = e.target;

            if (target instanceof HTMLElement && target.closest?.('.roadmap-search-query-bar__suggestions')) {

                return;

            }

            if (shouldSkipResultArrowNav(target)) {

                return;

            }

            if (results.length === 0 || resultsStatus !== 'loaded') {

                return;

            }

            e.preventDefault();

            const orderedResults = [...results].sort((a, b) => {

                const left = String(a?.title || '').trim().toLocaleLowerCase('vi');

                const right = String(b?.title || '').trim().toLocaleLowerCase('vi');

                if (left === right) {

                    return 0;

                }

                const order = left < right ? -1 : 1;

                return sortAscending ? order : -order;

            });

            const idx = orderedResults.findIndex((r) => r._id === selectedRoadmapId);

            let nextIdx;

            if (e.key === 'ArrowDown') {

                nextIdx = idx < 0 ? 0 : (idx + 1) % orderedResults.length;

            } else {

                nextIdx = idx <= 0 ? orderedResults.length - 1 : idx - 1;

            }

            setSelectedRoadmapId(orderedResults[nextIdx]._id);
        }



        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);

    }, [results, resultsStatus, selectedRoadmapId, setSelectedRoadmapId]);



    const sortedResults = useMemo(() => {

        const copy = [...results];

        copy.sort((a, b) => {

            const left = String(a?.title || '').trim().toLocaleLowerCase('vi');

            const right = String(b?.title || '').trim().toLocaleLowerCase('vi');

            if (left === right) {

                return 0;

            }

            const order = left < right ? -1 : 1;

            return sortAscending ? order : -order;

        });

        return copy;

    }, [results, sortAscending]);

    useEffect(() => {
        if (resultsStatus !== 'loaded' || sortedResults.length === 0) {
            return;
        }

        const signature = sortedResults.map((result) => result._id).join('|');

        if (lastSortedResultsSignatureRef.current === signature) {
            return;
        }

        lastSortedResultsSignatureRef.current = signature;
        setSelectedRoadmapId(sortedResults[0]._id);
    }, [resultsStatus, sortedResults, setSelectedRoadmapId]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.dispatchEvent(
            new CustomEvent('roadmap-search-content-change', {
                detail: { hasSearchContent },
            })
        );
    }, [hasSearchContent]);



    return (

        <div className="roadmap-search-page">

            <header

                ref={queryAnchorRef}

                id="roadmap-search-query-anchor"

                className="roadmap-search-page__top"

                role="search"

                aria-label="Tìm kiếm roadmap"

            >

                <RoadmapSearchQueryBar

                    nameQuery={nameQuery}

                    setNameQuery={setNameQuery}

                    selectedTags={selectedTags}

                    setSelectedTags={setSelectedTags}

                    availableTags={availableTags}

                    inputRef={queryInputRef}

                    placeholder={ROADMAP_SEARCH_PLACEHOLDER}

                    sortAscending={sortAscending}

                    onToggleSort={() => setSortAscending((value) => !value)}

                    onHasSearchContentChange={setHasSearchContent}

                />

            </header>

            {hasSearchContent ? (
                <div className="roadmap-search-page__body">

                    <aside className="roadmap-search-page__left">

                        {errorMessage ? <p className="roadmap-search-page__error">{errorMessage}</p> : null}

                        <RoadmapSearchResults

                            results={sortedResults}

                            resultsStatus={resultsStatus}

                            selectedRoadmapId={selectedRoadmapId}

                            onSelectResult={setSelectedRoadmapId}

                            currentUserId={currentUserId}

                        />

                    </aside>

                    <section className="roadmap-search-page__right" aria-label="Xem trước roadmap">

                        <RoadmapPreviewPanel

                            previewData={previewData}

                            previewStatus={previewStatus}

                            errorMessage={errorMessage}

                        />

                    </section>

                </div>
            ) : null}

        </div>

    );

}


