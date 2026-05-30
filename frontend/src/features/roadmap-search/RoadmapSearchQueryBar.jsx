import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, X } from 'lucide-react';

function existingNormalizedSet(tags = []) {
    return new Set(tags.map((t) => String(t?.normalizedLabel || '').trim().toLowerCase()).filter(Boolean));
}

function assignRef(ref, el) {
    if (!ref) {
        return;
    }
    if (typeof ref === 'function') {
        ref(el);
    } else {
        ref.current = el;
    }
}

/**
 * Tìm theo tên; gõ `#` để nhập tag trong vùng riêng (highlight chỉ phần sau #).
 */
export default function RoadmapSearchQueryBar({
    nameQuery,
    setNameQuery,
    selectedTags = [],
    setSelectedTags,
    availableTags = [],
    inputRef: externalInputRef,
    placeholder = '',
    sortAscending = true,
    onToggleSort,
    onHasSearchContentChange,
}) {
    const [tagDraft, setTagDraft] = useState(null);
    const combinedRef = useRef(null);
    const nameInputRef = useRef(null);
    const tagInputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const prevTagDraftRef = useRef(null);

    const filteredSuggestions = useMemo(() => {
        const selectedNormalized = existingNormalizedSet(selectedTags);
        if (tagDraft === null) {
            return [];
        }
        const needle = String(tagDraft).trim().toLowerCase();
        return availableTags
            .filter((tag) => {
                const nl = String(tag?.normalizedLabel || '').toLowerCase();
                const lb = String(tag?.label || '').toLowerCase();
                if (selectedNormalized.has(nl)) {
                    return false;
                }
                if (!needle) {
                    return true;
                }
                return lb.includes(needle) || nl.includes(needle);
            })
            .slice(0, 8);
    }, [availableTags, tagDraft, selectedTags]);

    /** Thứ tự đúng với DOM: catalog trước, dòng “Thêm …” sau (nếu có). */
    const suggestionOptions = useMemo(() => {
        const opts = filteredSuggestions.map((tag) => ({
            kind: 'catalog',
            label: tag.label,
        }));
        const trimmed = String(tagDraft || '').trim();
        if (
            trimmed &&
            !filteredSuggestions.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())
        ) {
            opts.push({ kind: 'free', label: trimmed });
        }
        return opts;
    }, [filteredSuggestions, tagDraft]);

    const [suggestionHighlightIndex, setSuggestionHighlightIndex] = useState(0);

    useEffect(() => {
        setSuggestionHighlightIndex(0);
    }, [suggestionOptions]);

    const commitTag = useCallback(
        (rawLabel) => {
            const trimmed = String(rawLabel || '').trim();
            if (!trimmed) {
                setTagDraft(null);
                return;
            }
            const lower = trimmed.toLowerCase();
            const fromCatalog = availableTags.find(
                (t) =>
                    String(t?.normalizedLabel || '').toLowerCase() === lower ||
                    String(t?.label || '').trim().toLowerCase() === lower
            );
            const next = fromCatalog
                ? { label: fromCatalog.label, normalizedLabel: String(fromCatalog.normalizedLabel || '').toLowerCase() }
                : { label: trimmed, normalizedLabel: lower };

            setSelectedTags((prev) => {
                const taken = existingNormalizedSet(prev);
                if (taken.has(next.normalizedLabel)) {
                    return prev;
                }
                return [...prev, next];
            });
            setTagDraft(null);
        },
        [availableTags, setSelectedTags]
    );

    const removeTag = useCallback(
        (normalizedLabel) => {
            setSelectedTags((prev) => prev.filter((t) => t.normalizedLabel !== normalizedLabel));
        },
        [setSelectedTags]
    );

    const handleCombinedChange = useCallback(
        (event) => {
            const v = event.target.value;
            const idx = v.lastIndexOf('#');
            if (idx === -1) {
                setNameQuery(v);
                setTagDraft(null);
                return;
            }
            setNameQuery(v.slice(0, idx));
            setTagDraft(v.slice(idx + 1));
        },
        [setNameQuery]
    );

    const handleCombinedKeyDown = useCallback(
        (event) => {
            if (event.key === 'Enter' && tagDraft !== null) {
                event.preventDefault();
                commitTag(tagDraft);
                return;
            }
            if (event.key === 'Escape' && tagDraft !== null) {
                event.preventDefault();
                setTagDraft(null);
            }
        },
        [commitTag, tagDraft]
    );

    const handleTagKeyDown = useCallback(
        (event) => {
            const len = suggestionOptions.length;
            if (event.key === 'ArrowDown' && len > 0) {
                event.preventDefault();
                setSuggestionHighlightIndex((i) => Math.min(i + 1, len - 1));
                return;
            }
            if (event.key === 'ArrowUp' && len > 0) {
                event.preventDefault();
                setSuggestionHighlightIndex((i) => Math.max(i - 1, 0));
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                const pick = suggestionOptions[suggestionHighlightIndex];
                if (pick) {
                    commitTag(pick.label);
                    return;
                }
                commitTag(tagDraft);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setTagDraft(null);
            }
        },
        [commitTag, suggestionHighlightIndex, suggestionOptions, tagDraft]
    );

    useLayoutEffect(() => {
        const prev = prevTagDraftRef.current;
        prevTagDraftRef.current = tagDraft;
        if (tagDraft !== null && prev === null) {
            window.requestAnimationFrame(() => tagInputRef.current?.focus());
        }
        if (tagDraft === null && prev !== null) {
            window.requestAnimationFrame(() => combinedRef.current?.focus());
        }
    }, [tagDraft]);

    useEffect(() => {
        function handlePointerDown(event) {
            if (tagDraft === null) {
                return;
            }
            const t = event.target;
            const inside =
                nameInputRef.current?.contains(t) ||
                tagInputRef.current?.contains(t) ||
                suggestionsRef.current?.contains(t);
            if (inside) {
                return;
            }
            setTagDraft(null);
        }

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [tagDraft]);

    const showSuggestions = tagDraft !== null;
    const isSplit = tagDraft !== null;

    useEffect(() => {
        if (typeof onHasSearchContentChange !== 'function') {
            return;
        }

        onHasSearchContentChange(
            String(nameQuery || '').trim().length > 0 ||
                selectedTags.length > 0 ||
                tagDraft !== null
        );
    }, [nameQuery, onHasSearchContentChange, selectedTags.length, tagDraft]);

    const setCombinedEl = useCallback(
        (el) => {
            combinedRef.current = el;
            assignRef(externalInputRef, el);
        },
        [externalInputRef]
    );

    const setNameEl = useCallback(
        (el) => {
            nameInputRef.current = el;
            assignRef(externalInputRef, el);
        },
        [externalInputRef]
    );

    return (
    <div className="roadmap-search-query-bar">
        <div className="roadmap-search-query-bar__shell">
            {/* HÀNG 1: Chứa ô nhập liệu và nút Sort */}
            <div className="roadmap-search-query-bar__row">
                <div className="roadmap-search-query-bar__field-wrap">
                    {!isSplit ? (
                        <input
                            ref={setCombinedEl}
                            className="roadmap-search-page__input roadmap-search-page__input--full"
                            type="text"
                            name="roadmap-search-query"
                            placeholder={placeholder}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            value={nameQuery}
                            onChange={handleCombinedChange}
                            onKeyDown={handleCombinedKeyDown}
                            aria-expanded={false}
                        />
                    ) : (
                        <div className="roadmap-search-query-bar__split" role="group" aria-label="Tìm kiếm và tag">
                            <input
                                ref={setNameEl}
                                className="roadmap-search-page__input roadmap-search-page__input--name-part"
                                type="text"
                                name="roadmap-search-name"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                value={nameQuery}
                                onChange={(e) => setNameQuery(e.target.value)}
                                aria-label="Từ khóa tên roadmap"
                            />
                            <span className="roadmap-search-query-bar__hash" aria-hidden="true">#</span>
                            <div className="roadmap-search-query-bar__tag-zone">
                                <input
                                    ref={tagInputRef}
                                    className="roadmap-search-query-bar__tag-input"
                                    type="text"
                                    name="roadmap-search-tag-draft"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    value={tagDraft}
                                    onChange={(e) => setTagDraft(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="tag…"
                                    aria-label="Nhập tag sau dấu #"
                                    aria-controls={showSuggestions ? 'roadmap-search-tag-suggestions' : undefined}
                                    aria-expanded={showSuggestions}
                                />
                            </div>
                        </div>
                    )}

                    {/* Gợi ý từ danh mục popup giữ nguyên vị trí cũ */}
                    {showSuggestions ? (
                        <div
                            ref={suggestionsRef}
                            id="roadmap-search-tag-suggestions"
                            className="roadmap-search-query-bar__suggestions"
                            role="listbox"
                            aria-label="Gợi ý tag"
                        >
                            {filteredSuggestions.map((tag, idx) => (
                                <button
                                    key={tag.normalizedLabel}
                                    type="button"
                                    role="option"
                                    aria-selected={idx === suggestionHighlightIndex}
                                    className={`roadmap-search-query-bar__suggestion${idx === suggestionHighlightIndex ? ' roadmap-search-query-bar__suggestion--keyboard-active' : ''}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setSuggestionHighlightIndex(idx)}
                                    onClick={() => commitTag(tag.label)}
                                >
                                    {tag.label}
                                </button>
                            ))}
                            {String(tagDraft || '').trim().length > 0 &&
                            !filteredSuggestions.some(
                                (t) => t.label.toLowerCase() === String(tagDraft).trim().toLowerCase()
                            ) ? (
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={suggestionHighlightIndex === filteredSuggestions.length}
                                    className={`roadmap-search-query-bar__suggestion roadmap-search-query-bar__suggestion--free${suggestionHighlightIndex === filteredSuggestions.length ? ' roadmap-search-query-bar__suggestion--keyboard-active' : ''}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setSuggestionHighlightIndex(filteredSuggestions.length)}
                                    onClick={() => commitTag(tagDraft)}
                                >
                                    Thêm “{String(tagDraft).trim()}”
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {/* Nút sort */}
                {typeof onToggleSort === 'function' ? (
                    <button
                        type="button"
                        className="roadmap-search-query-bar__sort"
                        onClick={onToggleSort}
                        aria-label={sortAscending ? 'Sắp xếp Z–A' : 'Sắp xếp A–Z'}
                        title={sortAscending ? 'Sắp xếp Z–A' : 'Sắp xếp A–Z'}
                    >
                        {sortAscending ? <ArrowDownAZ size={18} aria-hidden="true" /> : <ArrowUpAZ size={18} aria-hidden="true" />}
                    </button>
                ) : null}
            </div>

            {/* HÀNG 2: Đã di dời xuống ĐÂY. Hiển thị danh sách các tag đã chọn ngay phía dưới */}
            {selectedTags.length > 0 ? (
                <div className="roadmap-search-query-bar__inline-tags" aria-label="Tag đang tìm">
                    {selectedTags.map((tag) => (
                        <span key={tag.normalizedLabel} className="roadmap-search-query-bar__inline-tag">
                            <span className="roadmap-search-query-bar__inline-tag-label">#{tag.label}</span>
                            <button
                                type="button"
                                className="roadmap-search-query-bar__inline-tag-remove"
                                aria-label={`Xóa tag ${tag.label}`}
                                onClick={() => removeTag(tag.normalizedLabel)}
                            >
                                <X size={12} aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    </div>
);
}
