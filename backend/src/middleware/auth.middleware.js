function requireAuth(req, res, next) {
	const authHeader = req.header('authorization') || req.header('Authorization');
	const fallbackUserId = req.header('x-user-id');
	const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
	const userId = bearerToken || fallbackUserId;

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
