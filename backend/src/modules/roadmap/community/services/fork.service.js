'use strict';

const { CommunityError } = require('../community.errors');

async function forkPost() {
	throw new CommunityError(
		501,
		'NOT_IMPLEMENTED',
		'Fork workflow will be implemented in US7 tasks for roadmap-community.'
	);
}

module.exports = {
	forkPost,
};
