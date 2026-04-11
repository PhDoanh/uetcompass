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
	const response = await getClient().extract([url], { extract_depth: 'advanced' });
	const results = Array.isArray(response?.results) ? response.results : [];
	const raw = results[0]?.raw_content || results[0]?.rawContent;
	if (results.length === 0 || !raw) {
		throw new Error(`Tavily returned no extractable content for ${url}`);
	}
	return raw;
}

async function extractSequential(urls, onError) {
	const ok = [];
	for (const url of urls) {
		try {
			ok.push({ url, markdown: await extractContent(url) });
		} catch (error) {
			onError?.({
				event: 'URL_SKIP',
				url,
				stage: 'tavily',
				reason: error.message,
			});
		}
	}
	return ok;
}

module.exports = {
	extractContent,
	extractSequential,
};
