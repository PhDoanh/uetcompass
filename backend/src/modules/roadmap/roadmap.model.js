'use strict';

const mongoose = require('mongoose');

/**
 * Edge Schema: Định nghĩa luồng học (Flow) và các mũi tên nối các Node.
 */
const EdgeSchema = new mongoose.Schema({
    edgeId: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type:   { 
        type: String, 
        enum: ['default', 'dashed'], 
        default: 'default' 
    },
}, { _id: false });

/**
 * Node Schema: Định nghĩa nội dung và quan hệ logic của từng thực thể.
 */
const NodeSchema = new mongoose.Schema({
    nodeId: { type: String, required: true },
    nodeType: { 
        type: String, 
        required: true,
        enum: ['skill', 'milestone', 'task', 'note', 'group']
    },
    nodeName: { type: String, required: true }, 
    
    // Liên kết logic
    skillId:      { type: String, default: null }, // Slug từ Registry
    subRoadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', default: null },
    parentNodeId: { type: String, default: null },

    // Nội dung học thuật
    description: { type: String, default: '' },
    resources:   { type: [mongoose.Schema.Types.Mixed], default: [] },
    
    // Dữ liệu đào tạo UET
    relatedCourses: [{
        courseCode: { type: String, required: true },
        courseName: { type: String, required: true },
        credits:    { type: Number, required: true }
    }],

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

/**
 * Roadmap Schema: Hợp nhất AI và Manual, tách biệt Content và Visual.
 */
const RoadmapSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    studentProfileId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'StudentProfile',
        required: true
    },
    
    source: { 
        type: String, 
        enum: ['ai', 'manual', 'template'], 
        required: true 
    },
    roadmapName: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // PHẦN 1: NỘI DUNG (Content) - Logic và thông tin
    nodes: [NodeSchema],

    // PHẦN 2: TRÌNH BÀY (Visual/Flow) - Mũi tên và Layout
    edges: [EdgeSchema],
    positions: { type: mongoose.Schema.Types.Mixed, default: {} },
    zoom: { type: Number, default: 1 },
    elkOptions: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    // Dữ liệu phụ trợ
    yamlCode: { type: String }, 
    personalisationLevel: { type: String, enum: ['full', 'low'] },
    
    status: { 
        type: String, 
        enum: ['draft', 'active', 'archived', 'published'], 
        default: 'active' 
    },
    isPrimary: { type: Boolean, default: false },
    isPublic:  { type: Boolean, default: false },
    
    createdAt: { type: Date, default: null },
    sharedAt: { type: Date, default: null },
    editedAt: { type: Date, default: null }
}, {
    collection: 'roadmaps',
    timestamps: true,
    versionKey: false
});

// Indexes
RoadmapSchema.index({ userId: 1, isPrimary: 1 }, { 
    unique: true, 
    partialFilterExpression: { isPrimary: true },
    name: 'primary_roadmap_unique'
});
RoadmapSchema.index({ userId: 1, roadmapName: 1 });
RoadmapSchema.index({ status: 1, isPublic: 1 }, { name: 'published_roadmaps', partialFilterExpression: { status: 'published', isPublic: true } });

const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', RoadmapSchema);

module.exports = { Roadmap };
