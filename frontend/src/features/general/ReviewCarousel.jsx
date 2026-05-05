import React, { useEffect, useMemo, useState } from 'react';
import reviewApi from '../../services/review.api';
import { Star } from 'lucide-react';

function ReviewCard({ review }) {
	return (
		<article className="review-carousel__card">
			<div className="review-carousel__author">
				<div className="review-carousel__author-avatar">
					{review?.avatarUrl ? (
						<img src={review?.avatarUrl} alt="Ảnh đại diện người chia sẻ" className="review-carousel__avatar-img" />
					) : (
						<span>{(review?.studentDisplayName?.charAt(0) || 'U').toUpperCase()}</span>
					)}
				</div>
				<span className="review-carousel__author-name">{review?.studentDisplayName || 'Sinh viên UET'}</span>
			</div>
			<div className="review-carousel__rating">
				{[1, 2, 3, 4, 5].map((value) => (
					<Star
						key={value}
						className={`review-carousel__star${value <= (review?.rating || 0) ? ' review-carousel__star--active' : ''}`}
					/>
				))}
			</div>
			<p className="review-carousel__content">{review?.content || ''}</p>
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
					<h2>Người dùng nói gì về UETCompass?</h2>
					<p>Các đánh giá hàng đầu từ cộng đồng UET.</p>
				</div>
			</div>

			<div className="review-carousel__viewport">
				<div className="review-carousel__track review-carousel__track--forward">
					{loading && trackItems.length === 0 ? <p className="review-carousel__empty">Đang tải đánh giá...</p> : null}
					{trackItems.map((review) => <ReviewCard key={review.reviewId || review._id} review={review} />)}
				</div>
				<div className="review-carousel__track review-carousel__track--reverse" aria-hidden="true">
					{trackItems.map((review) => <ReviewCard key={`reverse-${review.reviewId || review._id}`} review={review} />)}
				</div>
			</div>
		</section>
	);
}