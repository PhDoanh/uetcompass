'use strict';

const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./review.controller');

const reviewRouter = express.Router();

reviewRouter.get('/rating-stream', controller.ratingStream);
reviewRouter.get('/carousel', controller.listCarouselReviews);
reviewRouter.get('/', controller.listReviews);

reviewRouter.use(requireAuth);
reviewRouter.post('/', controller.submitReview);

module.exports = { reviewRouter };