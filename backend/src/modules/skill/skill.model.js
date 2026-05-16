'use strict';

const mongoose = require('mongoose');

/**
 * Skill Model: Lưu trữ dữ liệu biên tập (Curation) cho từng kỹ năng.
 * Đây là "Thư viện tri thức" dùng chung cho mọi Roadmap.
 */
const ResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url:   { type: String, required: true },
    type:  { 
        type: String, 
        enum: ['video', 'article', 'docs', 'course', 'project'], 
        default: 'article' 
    },
}, { _id: false });

const SkillSchema = new mongoose.Schema({
    // Slug duy nhất (ví dụ: 'nodejs', 'react') - Khớp với skillId trong Roadmap Node
    slug: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    skillName: { type: String, required: true }, // Tên hiển thị mặc định (ví dụ: "Node.js")
    description: { type: String, default: '' },
    
    // Tài nguyên học tập đã được biên tập
    resources: [ResourceSchema],
    
    // Link đến Roadmap chuyên sâu "chính chủ" cho kỹ năng này
    canonicalRoadmapId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Roadmap', 
        default: null 
    },
    
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
    collection: 'skills',
    timestamps: true,
    versionKey: false
});

SkillSchema.index({ slug: 1 });

const Skill = mongoose.models.Skill || mongoose.model('Skill', SkillSchema, 'skills');

module.exports = { Skill };
