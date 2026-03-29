const mongoose = require('mongoose');

const skillTagSchema = new mongoose.Schema({
    tagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag', required: true },
    normalizedName: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
});

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    description: { type: String },
    sourceCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    domain: { type: String, required: true },
    tags: [skillTagSchema],
    createdAt: { type: Date, default: Date.now, index: true },
});

const tagSchema = new mongoose.Schema({
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, unique: true },
    category: { type: String },
    usageCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

const taggingJobSchema = new mongoose.Schema({
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'done', 'failed'],
        default: 'pending',
        index: true
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    resultTags: [skillTagSchema],
    confidence: { type: Number, min: 0, max: 100 },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Compound index for efficient batch selection
taggingJobSchema.index({ status: 1, createdAt: 1 });

const Skill = mongoose.model('Skill', skillSchema);
const Tag = mongoose.model('Tag', tagSchema);
const TaggingJob = mongoose.model('TaggingJob', taggingJobSchema);

module.exports = { Skill, Tag, TaggingJob };