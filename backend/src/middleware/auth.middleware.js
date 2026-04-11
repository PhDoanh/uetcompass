const { verifyAccessToken } = require('../modules/auth/token.service');

function requireAuth(req, res, next) {
	const authHeader = req.header('authorization') || req.header('Authorization');
	const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
	let userId = '';

	if (bearerToken) {
		try {
			const payload = verifyAccessToken(bearerToken);
			userId = String(payload?.userId || '').trim();
		} catch (_) {
			return res.status(401).json({
				error: {
					code: 'UNAUTHORIZED',
					message: 'Missing or invalid authentication',
				},
			});
		}
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
	verifyToken: requireAuth,
};
