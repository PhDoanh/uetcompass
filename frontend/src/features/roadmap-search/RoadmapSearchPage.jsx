import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import RoadmapSearchResults from './RoadmapSearchResults';
import RoadmapSearchQueryBar from './RoadmapSearchQueryBar';
import RoadmapPreviewPanel from './RoadmapPreviewPanel';
import roadmapSearchApi from '../../services/roadmapSearch.api';
import { useRoadmapSearch } from './useRoadmapSearch';

export const ROADMAP_SEARCH_PLACEHOLDER =
    'Tìm theo tên… Gõ # để gắn tag, Enter để xác nhận tag.';
export const ROADMAP_SEARCH_DEBOUNCE_MS = 300;
export const ROADMAP_SEARCH_MIN_LENGTH = 2;

export default function RoadmapSearchPage() {
    const queryAnchorRef = useRef(null);
    const queryInputRef = useRef(null);
    const [availableTags, setAvailableTags] = useState([]);
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
            .catch(() => {});
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
            const idx = results.findIndex((r) => r._id === selectedRoadmapId);
            let nextIdx;
            if (e.key === 'ArrowDown') {
                nextIdx = idx < 0 ? 0 : (idx + 1) % results.length;
            } else {
                nextIdx = idx <= 0 ? results.length - 1 : idx - 1;
            }
            setSelectedRoadmapId(results[nextIdx]._id);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [results, resultsStatus, selectedRoadmapId, setSelectedRoadmapId]);

    return (
        <div className="roadmap-search-page">
            <section className="roadmap-search-page__left">
                <div
                    ref={queryAnchorRef}
                    id="roadmap-search-query-anchor"
                    className="roadmap-search-page__query"
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
                    />
                </div>
                <div className="roadmap-search-page__section-header">
                    <div>
                        <h2 className="roadmap-search-page__title">Roadmaps</h2>
                        <p className="roadmap-search-page__subtitle">
                            Tìm roadmap công khai theo tên và tag; xem trước bên phải.
                        </p>
                    </div>
                </div>
                {errorMessage ? <p className="roadmap-search-page__error">{errorMessage}</p> : null}
                <RoadmapSearchResults
                    results={results}
                    resultsStatus={resultsStatus}
                    selectedRoadmapId={selectedRoadmapId}
                    onSelectResult={setSelectedRoadmapId}
                />
            </section>
            <section className="roadmap-search-page__right">
                <RoadmapPreviewPanel
                    previewData={previewData}
                    previewStatus={previewStatus}
                    errorMessage={errorMessage}
                />
            </section>
        </div>
    );
}
