const searchService = require('./search.service');

async function query(req, res, next) {
    try {
        const { query } = req.body;
        const keyword = typeof query === 'string' ? query : req.body.keyword || (req.body.query && req.body.query.keyword);

        const result = await searchService.queryByKeyword(keyword);
        res.status(200).json(result);
    } catch (error) {
        if (error && error.status && error.code && error.message) {
            return res.status(error.status).json({ error: { code: error.code, message: error.message } });
        }

        next(error);
    }
}

module.exports = {
    query,
};
