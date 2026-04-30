import { API_BASE_URL, request, requestAuthed } from './http';

export function submitReview(token, body) {
	return requestAuthed('/reviews', token, {
		method: 'POST',
		body: JSON.stringify(body),
	});
}

export function listRoadmapReviews({ roadmapId, page = 1, limit = 10 } = {}) {
	const params = new URLSearchParams({
		roadmapId: String(roadmapId || '').trim(),
		page: String(page),
		limit: String(limit),
	});

	return request(`/reviews?${params.toString()}`, {
		method: 'GET',
	});
}

export function listCarouselReviews() {
	return request('/reviews/carousel', {
		method: 'GET',
	});
}

export function openReviewRatingStream() {
	return new EventSource(`${API_BASE_URL}/reviews/rating-stream`);
}

const reviewApi = {
	submitReview,
	listRoadmapReviews,
	listCarouselReviews,
	openReviewRatingStream,
};

export default reviewApi;