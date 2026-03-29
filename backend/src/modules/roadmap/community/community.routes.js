'use strict';

const express = require('express');
const { requireAuth } = require('../../../middleware/auth.middleware');

const shareLinksController = require('./controllers/shareLinks.controller');
const postsController = require('./controllers/posts.controller');
const likesController = require('./controllers/likes.controller');
const forkController = require('./controllers/fork.controller');

const communityRouter = express.Router();

communityRouter.post('/share-links', requireAuth, shareLinksController.createShareLink);
communityRouter.patch('/share-links/:token/access', requireAuth, shareLinksController.updateShareLinkAccess);
communityRouter.delete('/share-links/:token', requireAuth, shareLinksController.revokeShareLink);
communityRouter.get('/share-links/:token', shareLinksController.getShareLinkSnapshot);

communityRouter.post('/posts', requireAuth, postsController.publishPost);
communityRouter.delete('/posts/me', requireAuth, postsController.unpublishMyPost);
communityRouter.get('/posts', requireAuth, postsController.listPosts);
communityRouter.get('/posts/:postId', requireAuth, postsController.getPostDetail);

communityRouter.post('/posts/:postId/likes', requireAuth, likesController.likePost);
communityRouter.delete('/posts/:postId/likes', requireAuth, likesController.unlikePost);

communityRouter.post('/posts/:postId/fork', requireAuth, forkController.forkPost);

module.exports = communityRouter;
