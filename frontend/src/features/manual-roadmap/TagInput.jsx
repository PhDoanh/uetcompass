import React, { useRef, useState, useCallback } from 'react';
import { X, ChevronDown } from 'lucide-react';
import './tag-input.css';

/**
 * TagInput Component
 * Displays current tags as removable chips and allows adding new tags
 * Features:
 * - Tag chip display with remove button
 * - Autocomplete suggestions from available tags
 * - Duplicate prevention
 * - Free-form tag creation (if not matching suggestions)
 * - Click outside to close dropdown
 */
export default function TagInput({
    tags = [],
    availableTags = [],
    onTagsChange = () => { },
    isLoading = false,
    disabled = false,
}) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Get normalized labels of existing tags
    const existingNormalizedLabels = new Set(
        tags.map(tag => String(tag.label || '').trim().toLowerCase())
    );

    // Filter available tags to show only non-duplicates, ordered by relevance to input
    const filteredSuggestions = useCallback(() => {
        const normalizedInput = String(inputValue || '').trim().toLowerCase();

        if (!normalizedInput) {
            return availableTags.filter(tag =>
                !existingNormalizedLabels.has(String(tag.normalizedLabel || '').toLowerCase())
            ).slice(0, 8);
        }

        return availableTags
            .filter(tag => {
                const normalized = String(tag.normalizedLabel || '').toLowerCase();
                return !existingNormalizedLabels.has(normalized) &&
                    normalized.includes(normalizedInput);
            })
            .slice(0, 8);
    }, [inputValue, availableTags, existingNormalizedLabels]);

    // Handle add tag from suggestion or input
    const addTag = useCallback((label) => {
        const trimmed = String(label || '').trim();
        if (!trimmed) return;

        const normalized = trimmed.toLowerCase();
        if (existingNormalizedLabels.has(normalized)) {
            return; // Duplicate prevention
        }

        const newTag = {
            label: trimmed,
            normalizedLabel: normalized,
        };

        onTagsChange([...tags, newTag]);
        setInputValue('');
        setIsOpen(false);
    }, [tags, existingNormalizedLabels, onTagsChange]);

    // Handle remove tag
    const removeTag = useCallback((normalizedLabel) => {
        onTagsChange(
            tags.filter(tag => tag.normalizedLabel !== normalizedLabel)
        );
    }, [tags, onTagsChange]);

    // Handle key press in input
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
            return;
        }

        if (e.key === 'Escape') {
            setIsOpen(false);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            return;
        }
    }, [inputValue, addTag]);

    // Handle input change
    const handleInputChange = useCallback((e) => {
        setInputValue(e.target.value);
        setIsOpen(true);
    }, []);

    // Handle input focus
    const handleInputFocus = useCallback(() => {
        setIsOpen(true);
    }, []);

    // Handle suggestion click
    const handleSuggestionClick = useCallback((label) => {
        addTag(label);
        inputRef.current?.focus();
    }, [addTag]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (!containerRef.current?.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const suggestions = filteredSuggestions();
    const hasNoTags = tags.length === 0;
    const showPlaceholder = hasNoTags && !inputValue;

    return (
        <div className="tag-input-container" ref={containerRef}>
            <div className="tag-input-wrapper">
                {/* Display current tags as chips */}
                <div className="tag-chips">
                    {tags.map(tag => (
                        <div key={tag.normalizedLabel} className="tag-chip">
                            <span className="tag-chip-label">{tag.label}</span>
                            <button
                                type="button"
                                className="tag-chip-remove"
                                onClick={() => removeTag(tag.normalizedLabel)}
                                disabled={disabled || isLoading}
                                aria-label={`Remove tag ${tag.label}`}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Input field */}
                <div className="tag-input-field-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        className="tag-input-field"
                        placeholder={showPlaceholder ? 'Add tags (e.g., Frontend, React)' : ''}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        disabled={disabled || isLoading}
                        autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                        <ChevronDown
                            size={16}
                            className="tag-input-dropdown-icon"
                            style={{
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Suggestions dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="tag-suggestions">
                    {suggestions.map(tag => (
                        <button
                            key={tag.normalizedLabel}
                            type="button"
                            className="tag-suggestion-item"
                            onClick={() => handleSuggestionClick(tag.label)}
                            disabled={disabled || isLoading}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty state message */}
            {isOpen && suggestions.length === 0 && inputValue.trim() && (
                <div className="tag-empty-state">
                    <p className="tag-empty-state-text">
                        Press Enter to create &quot;{inputValue.trim()}&quot;
                    </p>
                </div>
            )}
        </div>
    );
}
