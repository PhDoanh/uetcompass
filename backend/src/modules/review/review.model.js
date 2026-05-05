'use strict';

const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
	{
		roadmapId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Roadmap',
			required: true,
			index: true,
		},
		studentId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		content: {
			type: String,
			required: true,
			trim: true,
			maxlength: 5000,
		},
		status: {
			type: String,
			required: true,
			enum: ['pending', 'approved', 'flagged'],
			default: 'pending',
		},
	},
	{
		collection: 'reviews',
		timestamps: true,
		versionKey: false,
	}
);

ReviewSchema.index({ roadmapId: 1, studentId: 1 }, { unique: true, name: 'review_unique_per_student_roadmap' });
ReviewSchema.index({ roadmapId: 1, status: 1, createdAt: -1 }, { name: 'review_by_roadmap_status_createdAt' });
ReviewSchema.index({ status: 1, rating: -1, createdAt: -1 }, { name: 'review_carousel_sort' });

const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema, 'reviews');

module.exports = { Review };