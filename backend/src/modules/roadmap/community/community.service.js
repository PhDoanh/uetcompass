'use strict';

const repository = require('./community.repository');
const shareLinks = require('./services/shareLinks.service');
const posts = require('./services/posts.service');
const likes = require('./services/likes.service');
const fork = require('./services/fork.service');

module.exports = {
	repository,
	shareLinks,
	posts,
	likes,
	fork,
};
