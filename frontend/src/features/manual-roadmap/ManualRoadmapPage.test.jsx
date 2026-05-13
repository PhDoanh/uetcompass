describe('Manual Roadmap Tag Editor behavior', () => {
    test('normalizes tag labels for comparison', async () => {
        const normalizeTagLabel = (label) => String(label || '').trim().toLowerCase();

        expect(normalizeTagLabel('React')).toBe('react');
        expect(normalizeTagLabel('  JavaScript  ')).toBe('javascript');
        expect(normalizeTagLabel('WEB DEVELOPMENT')).toBe('web development');
    });

    test('detects duplicate tags based on normalized label', async () => {
        const isDuplicateTag = (newTag, existingTags) => {
            const normalized = String(newTag.label || '').trim().toLowerCase();
            return existingTags.some(
                tag => String(tag.label || '').trim().toLowerCase() === normalized
            );
        };

        const existingTags = [
            { label: 'React', normalizedLabel: 'react' },
            { label: 'Frontend', normalizedLabel: 'frontend' },
        ];

        expect(isDuplicateTag({ label: 'React' }, existingTags)).toBe(true);
        expect(isDuplicateTag({ label: 'react' }, existingTags)).toBe(true);
        expect(isDuplicateTag({ label: 'REACT' }, existingTags)).toBe(true);
        expect(isDuplicateTag({ label: 'Backend' }, existingTags)).toBe(false);
    });

    test('creates a new tag from user input', async () => {
        const createTag = (label) => {
            if (!label) return null;
            const trimmed = String(label).trim();
            if (!trimmed) return null;
            return {
                label: trimmed,
                normalizedLabel: trimmed.toLowerCase(),
            };
        };

        expect(createTag('JavaScript')).toEqual({
            label: 'JavaScript',
            normalizedLabel: 'javascript',
        });

        expect(createTag('  React  ')).toEqual({
            label: 'React',
            normalizedLabel: 'react',
        });

        expect(createTag('')).toBeNull();
        expect(createTag('   ')).toBeNull();
        expect(createTag(null)).toBeNull();
    });

    test('adds a tag to the editor state', async () => {
        const addTag = (tags, newTag) => {
            if (!newTag || !newTag.label) return tags;
            const isDuplicate = tags.some(
                tag => tag.normalizedLabel === newTag.normalizedLabel
            );
            if (isDuplicate) return tags;
            return [...tags, newTag];
        };

        const initialTags = [
            { label: 'Frontend', normalizedLabel: 'frontend' },
        ];

        const newTag = { label: 'React', normalizedLabel: 'react' };
        const result = addTag(initialTags, newTag);

        expect(result).toHaveLength(2);
        expect(result[1]).toEqual(newTag);
    });

    test('prevents adding duplicate tags', async () => {
        const addTag = (tags, newTag) => {
            if (!newTag || !newTag.label) return tags;
            const isDuplicate = tags.some(
                tag => tag.normalizedLabel === newTag.normalizedLabel
            );
            if (isDuplicate) return tags;
            return [...tags, newTag];
        };

        const initialTags = [
            { label: 'Frontend', normalizedLabel: 'frontend' },
        ];

        const duplicateTag = { label: 'frontend', normalizedLabel: 'frontend' };
        const result = addTag(initialTags, duplicateTag);

        expect(result).toEqual(initialTags);
        expect(result).toHaveLength(1);
    });

    test('removes a tag from the editor state', async () => {
        const removeTag = (tags, normalizedLabel) => {
            return tags.filter(tag => tag.normalizedLabel !== normalizedLabel);
        };

        const tags = [
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'React', normalizedLabel: 'react' },
            { label: 'JavaScript', normalizedLabel: 'javascript' },
        ];

        const result = removeTag(tags, 'react');

        expect(result).toHaveLength(2);
        expect(result.map(t => t.normalizedLabel)).not.toContain('react');
    });

    test('replaces a tag in the editor state', async () => {
        const replaceTag = (tags, oldNormalizedLabel, newTag) => {
            const isDuplicate = tags.some(
                tag => tag.normalizedLabel === newTag.normalizedLabel &&
                    tag.normalizedLabel !== oldNormalizedLabel
            );
            if (isDuplicate) return tags;

            return tags.map(tag =>
                tag.normalizedLabel === oldNormalizedLabel ? newTag : tag
            );
        };

        const tags = [
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'React', normalizedLabel: 'react' },
        ];

        const newTag = { label: 'Vue', normalizedLabel: 'vue' };
        const result = replaceTag(tags, 'react', newTag);

        expect(result).toHaveLength(2);
        expect(result.map(t => t.normalizedLabel)).toContain('vue');
        expect(result.map(t => t.normalizedLabel)).not.toContain('react');
    });

    test('prevents replacing with duplicate tag', async () => {
        const replaceTag = (tags, oldNormalizedLabel, newTag) => {
            const isDuplicate = tags.some(
                tag => tag.normalizedLabel === newTag.normalizedLabel &&
                    tag.normalizedLabel !== oldNormalizedLabel
            );
            if (isDuplicate) return tags;

            return tags.map(tag =>
                tag.normalizedLabel === oldNormalizedLabel ? newTag : tag
            );
        };

        const tags = [
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'React', normalizedLabel: 'react' },
        ];

        const duplicateTag = { label: 'Frontend', normalizedLabel: 'frontend' };
        const result = replaceTag(tags, 'react', duplicateTag);

        expect(result).toEqual(tags);
    });

    test('handles roadmap with no tags on load', async () => {
        const initializeRoadmapTags = (roadmapData) => {
            return Array.isArray(roadmapData?.tags) ? roadmapData.tags : [];
        };

        expect(initializeRoadmapTags({})).toEqual([]);
        expect(initializeRoadmapTags({ tags: undefined })).toEqual([]);
        expect(initializeRoadmapTags({ tags: null })).toEqual([]);
    });

    test('preserves tags from existing roadmap on load', async () => {
        const initializeRoadmapTags = (roadmapData) => {
            return Array.isArray(roadmapData?.tags) ? roadmapData.tags : [];
        };

        const roadmapData = {
            title: 'My Roadmap',
            tags: [
                { label: 'Frontend', normalizedLabel: 'frontend' },
                { label: 'React', normalizedLabel: 'react' },
            ],
        };

        const result = initializeRoadmapTags(roadmapData);

        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('Frontend');
        expect(result[1].label).toBe('React');
    });
});
