'use strict';

/**
 * Unit tests for manualRoadmap.service.js — Tag persistence
 * Tests: createDraft with tags, updateDraft with tags, getDistinctTags
 */

jest.mock('../../../src/modules/roadmap/manualRoadmap.model');
jest.mock('../../../src/modules/roadmap/graph.generator');
jest.mock('../../../src/modules/roadmap/roadmap.model');
jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
    StudentProfile: {
        findOne: jest.fn(),
    },
}));

const { ManualRoadmap } = require('../../../src/modules/roadmap/manualRoadmap.model');
const manualRoadmapService = require('../../../src/modules/roadmap/manualRoadmap.service');
const { enrichNodes, generateEdgesFromHierarchy, validateHierarchy } = require('../../../src/modules/roadmap/graph.generator');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const { Roadmap } = require('../../../src/modules/roadmap/roadmap.model');

const userId = 'user001';
const roadmapId = 'roadmap001';

beforeEach(() => {
    jest.clearAllMocks();
    enrichNodes.mockImplementation(nodes => nodes || []);
    generateEdgesFromHierarchy.mockReturnValue([]);
    validateHierarchy.mockReturnValue({ isValid: true, errors: [] });
    StudentProfile.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
            _id: 'profile001',
            userId,
        }),
    });
    Roadmap.findOneAndUpdate = jest.fn().mockResolvedValue({});
});

describe('manualRoadmap.service — createDraft with tags', () => {
    test('creates a roadmap with tags', async () => {
        const mockRoadmap = {
            _id: roadmapId,
            userId,
            title: 'Test Roadmap',
            description: 'Test',
            yamlCode: 'title: Test',
            tags: [
                { label: 'Frontend', normalizedLabel: 'frontend' },
                { label: 'React', normalizedLabel: 'react' },
            ],
            toObject: () => ({
                _id: roadmapId,
                userId,
                title: 'Test Roadmap',
                tags: [
                    { label: 'Frontend', normalizedLabel: 'frontend' },
                    { label: 'React', normalizedLabel: 'react' },
                ],
            }),
        };

        ManualRoadmap.create = jest.fn().mockResolvedValue(mockRoadmap);

        const result = await manualRoadmapService.createDraft(userId, {
            title: 'Test Roadmap',
            description: 'Test',
            yamlCode: 'title: Test',
            nodes: [],
            tags: [
                { label: 'Frontend', normalizedLabel: 'frontend' },
                { label: 'React', normalizedLabel: 'react' },
            ],
        });

        expect(ManualRoadmap.create).toHaveBeenCalled();
        const createCall = ManualRoadmap.create.mock.calls[0][0];
        expect(createCall.tags).toEqual([
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'React', normalizedLabel: 'react' },
        ]);
        expect(result.tags).toEqual([
            { label: 'Frontend', normalizedLabel: 'frontend' },
            { label: 'React', normalizedLabel: 'react' },
        ]);
    });

    test('creates a roadmap with empty tags array when none provided', async () => {
        const mockRoadmap = {
            _id: roadmapId,
            userId,
            title: 'Test Roadmap',
            tags: [],
            toObject: () => ({
                _id: roadmapId,
                userId,
                title: 'Test Roadmap',
                tags: [],
            }),
        };

        ManualRoadmap.create = jest.fn().mockResolvedValue(mockRoadmap);

        await manualRoadmapService.createDraft(userId, {
            title: 'Test Roadmap',
            yamlCode: 'title: Test',
            nodes: [],
        });

        const createCall = ManualRoadmap.create.mock.calls[0][0];
        expect(createCall.tags).toEqual([]);
    });
});

describe('manualRoadmap.service — updateDraft with tags', () => {
    test('updates a roadmap with new tags', async () => {
        const mockRoadmap = {
            _id: roadmapId,
            userId,
            title: 'Updated Roadmap',
            status: 'draft',
            tags: [],
            save: jest.fn().mockResolvedValue(true),
            toObject: () => ({
                _id: roadmapId,
                title: 'Updated Roadmap',
                tags: [
                    { label: 'Backend', normalizedLabel: 'backend' },
                    { label: 'Node.js', normalizedLabel: 'node.js' },
                ],
            }),
        };

        ManualRoadmap.findOne = jest.fn().mockResolvedValue(mockRoadmap);

        const result = await manualRoadmapService.updateDraft(roadmapId, userId, {
            title: 'Updated Roadmap',
            yamlCode: 'title: Updated',
            nodes: [],
            tags: [
                { label: 'Backend', normalizedLabel: 'backend' },
                { label: 'Node.js', normalizedLabel: 'node.js' },
            ],
        });

        expect(mockRoadmap.tags).toEqual([
            { label: 'Backend', normalizedLabel: 'backend' },
            { label: 'Node.js', normalizedLabel: 'node.js' },
        ]);
        expect(result.tags).toEqual([
            { label: 'Backend', normalizedLabel: 'backend' },
            { label: 'Node.js', normalizedLabel: 'node.js' },
        ]);
    });

    test('preserves tags when updating a roadmap without providing tags', async () => {
        const originalTags = [{ label: 'Existing', normalizedLabel: 'existing' }];
        const mockRoadmap = {
            _id: roadmapId,
            userId,
            title: 'Updated Roadmap',
            status: 'draft',
            tags: originalTags,
            save: jest.fn().mockResolvedValue(true),
            toObject: () => ({
                _id: roadmapId,
                title: 'Updated Roadmap',
                tags: [],
            }),
        };

        ManualRoadmap.findOne = jest.fn().mockResolvedValue(mockRoadmap);

        await manualRoadmapService.updateDraft(roadmapId, userId, {
            title: 'Updated Roadmap',
            yamlCode: 'title: Updated',
            nodes: [],
        });

        // When no tags provided, it should set to empty array (not preserve)
        expect(mockRoadmap.tags).toEqual([]);
    });

    test('throws error when roadmap not found', async () => {
        ManualRoadmap.findOne = jest.fn().mockResolvedValue(null);

        await expect(
            manualRoadmapService.updateDraft(roadmapId, userId, {
                title: 'Updated',
                yamlCode: 'title: Updated',
                nodes: [],
                tags: [],
            })
        ).rejects.toThrow('Manual roadmap not found.');
    });

    test('throws error when roadmap is not draft status', async () => {
        const mockRoadmap = {
            _id: roadmapId,
            userId,
            status: 'published',
        };

        ManualRoadmap.findOne = jest.fn().mockResolvedValue(mockRoadmap);

        await expect(
            manualRoadmapService.updateDraft(roadmapId, userId, {
                title: 'Updated',
                yamlCode: 'title: Updated',
                nodes: [],
                tags: [],
            })
        ).rejects.toThrow('Only draft roadmaps can be updated.');
    });
});

describe('manualRoadmap.service — getDistinctTags', () => {
    test('returns distinct tags from all public roadmaps', async () => {
        const mockRoadmaps = [
            {
                _id: 'roadmap1',
                tags: [
                    { label: 'Frontend', normalizedLabel: 'frontend' },
                    { label: 'React', normalizedLabel: 'react' },
                ],
            },
            {
                _id: 'roadmap2',
                tags: [
                    { label: 'React', normalizedLabel: 'react' },
                    { label: 'Node.js', normalizedLabel: 'node.js' },
                ],
            },
        ];

        ManualRoadmap.find = jest.fn().mockReturnValue({
            lean: () => Promise.resolve(mockRoadmaps),
        });

        const result = await manualRoadmapService.getDistinctTags();

        expect(ManualRoadmap.find).toHaveBeenCalledWith({ isPublic: true }, { tags: 1 });
        expect(result).toHaveLength(3);
        expect(result.map(t => t.normalizedLabel)).toContain('frontend');
        expect(result.map(t => t.normalizedLabel)).toContain('react');
        expect(result.map(t => t.normalizedLabel)).toContain('node.js');
    });

    test('returns empty array when no public roadmaps exist', async () => {
        ManualRoadmap.find = jest.fn().mockReturnValue({
            lean: () => Promise.resolve([]),
        });

        const result = await manualRoadmapService.getDistinctTags();

        expect(result).toEqual([]);
    });

    test('returns empty array when public roadmaps have no tags', async () => {
        const mockRoadmaps = [
            { _id: 'roadmap1', tags: [] },
            { _id: 'roadmap2', tags: [] },
        ];

        ManualRoadmap.find = jest.fn().mockReturnValue({
            lean: () => Promise.resolve(mockRoadmaps),
        });

        const result = await manualRoadmapService.getDistinctTags();

        expect(result).toEqual([]);
    });

    test('handles roadmaps with missing tags field', async () => {
        const mockRoadmaps = [
            { _id: 'roadmap1', tags: [{ label: 'Frontend', normalizedLabel: 'frontend' }] },
            { _id: 'roadmap2' }, // no tags field
        ];

        ManualRoadmap.find = jest.fn().mockReturnValue({
            lean: () => Promise.resolve(mockRoadmaps),
        });

        const result = await manualRoadmapService.getDistinctTags();

        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Frontend');
    });

    test('returns tags sorted by label', async () => {
        const mockRoadmaps = [
            {
                _id: 'roadmap1',
                tags: [
                    { label: 'Zebra', normalizedLabel: 'zebra' },
                    { label: 'Apple', normalizedLabel: 'apple' },
                    { label: 'Mango', normalizedLabel: 'mango' },
                ],
            },
        ];

        ManualRoadmap.find = jest.fn().mockReturnValue({
            lean: () => Promise.resolve(mockRoadmaps),
        });

        const result = await manualRoadmapService.getDistinctTags();

        expect(result[0].label).toBe('Apple');
        expect(result[1].label).toBe('Mango');
        expect(result[2].label).toBe('Zebra');
    });
});
