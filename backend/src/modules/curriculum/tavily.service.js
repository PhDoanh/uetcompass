const { tavily } = require('@tavily/core');

let client;

function getClient() {
	if (!client) {
		if (!process.env.TAVILY_API_KEY) {
			throw new Error('Missing TAVILY_API_KEY');
		}
		client = tavily({ apiKey: process.env.TAVILY_API_KEY });
	}
	return client;
}

async function extractContent(url) {
	const response = await getClient().extract([url], { extract_depth: "advanced" });
	const results = Array.isArray(response?.results) ? response.results : [];
	if (results.length === 0 || !results[0]?.rawContent) {
		throw new Error(`Tavily returned no extractable content for ${url}`);
	}
	return results[0].rawContent;
}

module.exports = {
	extractContent,
};
