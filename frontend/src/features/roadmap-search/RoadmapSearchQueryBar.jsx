import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

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
            if (event.key === 'Enter') {
                event.preventDefault();
                commitTag(tagDraft);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setTagDraft(null);
            }
        },
        [commitTag, tagDraft]
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
                <div className="roadmap-search-query-bar__row">
                    <Search className="roadmap-search-page__query-icon" size={18} aria-hidden="true" />
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
                                <span className="roadmap-search-query-bar__hash" aria-hidden="true">
                                    #
                                </span>
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
                        {showSuggestions ? (
                            <div
                                ref={suggestionsRef}
                                id="roadmap-search-tag-suggestions"
                                className="roadmap-search-query-bar__suggestions"
                                role="listbox"
                                aria-label="Gợi ý tag"
                            >
                                {filteredSuggestions.map((tag) => (
                                    <button
                                        key={tag.normalizedLabel}
                                        type="button"
                                        role="option"
                                        className="roadmap-search-query-bar__suggestion"
                                        onMouseDown={(e) => e.preventDefault()}
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
                                        className="roadmap-search-query-bar__suggestion roadmap-search-query-bar__suggestion--free"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => commitTag(tagDraft)}
                                    >
                                        Thêm “{String(tagDraft).trim()}”
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            {selectedTags.length > 0 ? (
                <div className="roadmap-search-query-bar__chips" aria-label="Tag đang lọc">
                    {selectedTags.map((tag) => (
                        <span key={tag.normalizedLabel} className="roadmap-search-query-bar__chip">
                            <span className="roadmap-search-query-bar__chip-label">{tag.label}</span>
                            <button
                                type="button"
                                className="roadmap-search-query-bar__chip-remove"
                                aria-label={`Xóa tag ${tag.label}`}
                                onClick={() => removeTag(tag.normalizedLabel)}
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
