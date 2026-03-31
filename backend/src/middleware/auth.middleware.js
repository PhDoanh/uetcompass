function requireAuth(req, res, next) {
	const authHeader = req.header('authorization') || req.header('Authorization');
	const fallbackUserId = req.header('x-user-id');
	const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
	const userId = bearerToken || fallbackUserId;
	const isSkillTreeRequest = String(req.originalUrl || '').startsWith('/api/skill-tree');
	const allowSkillTreeGuest = process.env.SKILL_TREE_DEV_BYPASS_AUTH === 'true' || process.env.NODE_ENV !== 'production';
	const devUserId = process.env.SKILL_TREE_DEV_USER_ID || '000000000000000000000001';

	if (!userId && isSkillTreeRequest && allowSkillTreeGuest) {
		req.user = { userId: devUserId };
		return next();
	}

	if (!userId) {
		return res.status(401).json({
			error: {
				code: 'UNAUTHORIZED',
				message: 'Missing or invalid authentication',
			},
		});
	}

	req.user = { userId };
	return next();
}

module.exports = {
	requireAuth,
};
