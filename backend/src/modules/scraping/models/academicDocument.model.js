const mongoose = require('mongoose');

const academicDocumentSchema = new mongoose.Schema(
  {
    roadmapNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadmapNode',
      required: true
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      default: null
    },
    title: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    url: {
      type: String,
      required: true,
      unique: true
    },
    sourceType: {
      type: String,
      enum: ['uet_official', 'github', 'external'],
      required: true
    },
    documentType: {
      type: String,
      enum: ['slide', 'lecture_note', 'syllabus', 'exercise', 'code_sample'],
      required: true
    },
    courseName: {
      type: String,
      required: true,
      maxlength: 200
    },
    crawlReason: {
      type: String,
      enum: ['course_name_match', 'keyword_extracted'],
      required: true
    },
    inferenceConfidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    lastCrawledAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'academic_documents',
    timestamps: true
  }
);

// Indexes as per data-model.md
academicDocumentSchema.index({ url: 1 }, { unique: true });
academicDocumentSchema.index({ roadmapNodeId: 1, sourceType: 1 });
academicDocumentSchema.index({ roadmapNodeId: 1, isVisible: 1 });
academicDocumentSchema.index({ skillId: 1 });

module.exports = mongoose.model('AcademicDocument', academicDocumentSchema);
