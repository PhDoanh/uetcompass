'use strict';

/**
 * Unit tests for manualRoadmapValidation.service.js — Tag validation functions
 * Tests: normalizeTag, validateAndNormalizeTags (deduplication, empty handling)
 */

const { normalizeTag, validateAndNormalizeTags } = require('../../../src/modules/roadmap/manualRoadmapValidation.service');

describe('manualRoadmapValidation.service — normalizeTag', () => {
    test('normalizes a valid tag with label', () => {
        const tag = { label: 'JavaScript' };
        const result = normalizeTag(tag);

        expect(result).toEqual({
            label: 'JavaScript',
            normalizedLabel: 'javascript',
        });
    });

    test('trims whitespace from label', () => {
        const tag = { label: '  Web Development  ' };
        const result = normalizeTag(tag);

        expect(result).toEqual({
            label: 'Web Development',
            normalizedLabel: 'web development',
        });
    });

    test('returns null when tag is null', () => {
        const result = normalizeTag(null);
        expect(result).toBeNull();
    });

    test('returns null when label is empty string', () => {
        const tag = { label: '' };
        const result = normalizeTag(tag);
        expect(result).toBeNull();
    });

    test('returns null when label is whitespace only', () => {
        const tag = { label: '   ' };
        const result = normalizeTag(tag);
        expect(result).toBeNull();
    });
});

describe('manualRoadmapValidation.service — validateAndNormalizeTags', () => {
    test('returns empty array when tags is null', () => {
        const result = validateAndNormalizeTags(null);
        expect(result).toEqual([]);
    });

    test('returns empty array when tags is undefined', () => {
        const result = validateAndNormalizeTags(undefined);
        expect(result).toEqual([]);
    });

    test('returns empty array when tags is empty array', () => {
        const result = validateAndNormalizeTags([]);
        expect(result).toEqual([]);
    });

    test('normalizes a single tag', () => {
        const tags = [{ label: 'React' }];
        const result = validateAndNormalizeTags(tags);

        expect(result).toEqual([
            { label: 'React', normalizedLabel: 'react' },
        ]);
    });

    test('normalizes multiple unique tags', () => {
        const tags = [
            { label: 'Frontend' },
            { label: 'JavaScript' },
            { label: 'React' },
        ];
        const result = validateAndNormalizeTags(tags);

        expect(result).toEqual([
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'JavaScript', normalizedLabel: 'javascript' },
            { label: 'React', normalizedLabel: 'react' },
        ]);
    });

    test('removes duplicate tags based on normalized label', () => {
        const tags = [
            { label: 'React' },
            { label: 'react' },
            { label: 'REACT' },
        ];
        const result = validateAndNormalizeTags(tags);

        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('React');
        expect(result[0].normalizedLabel).toBe('react');
    });

    test('skips tags with empty labels', () => {
        const tags = [
            { label: 'Frontend' },
            { label: '' },
            { label: 'Backend' },
        ];
        const result = validateAndNormalizeTags(tags);

        expect(result).toHaveLength(2);
        expect(result).toEqual([
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'Backend', normalizedLabel: 'backend' },
        ]);
    });

    test('preserves order of first occurrence when deduplicating', () => {
        const tags = [
            { label: 'First' },
            { label: 'Second' },
            { label: 'first' }, // duplicate
            { label: 'Third' },
        ];
        const result = validateAndNormalizeTags(tags);

        expect(result).toHaveLength(3);
        expect(result[0].label).toBe('First');
        expect(result[1].label).toBe('Second');
        expect(result[2].label).toBe('Third');
    });

    test('throws error when tags is not an array', () => {
        expect(() => validateAndNormalizeTags('not-an-array')).toThrow('Tags must be an array.');
    });

    test('throws error when tags is an object', () => {
        expect(() => validateAndNormalizeTags({ label: 'Tag' })).toThrow('Tags must be an array.');
    });
});
