import React, { useEffect, useMemo, useState } from 'react';
import reviewApi from '../../services/review.api';

function ReviewCard({ review }) {
	return (
		<article className="review-carousel__card">
			<div className="review-carousel__rating">{'★'.repeat(Math.max(1, Math.min(5, review?.rating || 0)))}</div>
			<p className="review-carousel__content">{review?.content || ''}</p>
			<div className="review-carousel__author">{review?.studentDisplayName || 'UET Student'}</div>
		</article>
	);
}

export default function ReviewCarousel({ visible = true }) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let isActive = true;
		async function loadCarousel() {
			try {
				setLoading(true);
				const payload = await reviewApi.listCarouselReviews();
				if (!isActive) return;
				setItems(Array.isArray(payload?.items) ? payload.items : []);
			} catch (_) {
				if (isActive) {
					setItems([]);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		}

		if (visible) {
			loadCarousel();
		}

		return () => {
			isActive = false;
		};
	}, [visible]);

	const trackItems = useMemo(() => items.slice(0, 20), [items]);
	if (!visible) {
		return null;
	}

	return (
		<section className="review-carousel" aria-label="User reviews">
			<div className="review-carousel__header">
				<div>
					<h2>User Reviews</h2>
					<p>Top reviews from the UET community.</p>
				</div>
			</div>

			<div className="review-carousel__viewport">
				<div className="review-carousel__track review-carousel__track--forward">
					{loading && trackItems.length === 0 ? <p className="review-carousel__empty">Loading reviews...</p> : null}
					{trackItems.map((review) => <ReviewCard key={review.reviewId || review._id} review={review} />)}
				</div>
				<div className="review-carousel__track review-carousel__track--reverse" aria-hidden="true">
					{trackItems.map((review) => <ReviewCard key={`reverse-${review.reviewId || review._id}`} review={review} />)}
				</div>
			</div>
		</section>
	);
}