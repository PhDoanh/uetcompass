import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { useNotification } from '../general/NotificationContainer';
import reviewApi from '../../services/review.api';

const PAGE_SIZE = 10;

function StarRow({ rating = 0, onChange = null, disabled = false }) {
	return (
		<div className="review-stars" role={onChange ? 'radiogroup' : 'img'} aria-label={`Rating ${rating} of 5`}>
			{[1, 2, 3, 4, 5].map((value) => {
				const active = value <= rating;
				return (
					<button
						key={value}
						type="button"
						className={`review-star${active ? ' review-star--active' : ''}`}
						aria-label={`${value} star${value > 1 ? 's' : ''}`}
						onClick={onChange ? () => onChange(value) : undefined}
						disabled={disabled || !onChange}
					>
						★
					</button>
				);
			})}
		</div>
	);
}

export default function ReviewTab({ roadmapId }) {
	const { accessToken, isAuthenticated } = useAuth();
	const { addNotification } = useNotification();
	const [reviews, setReviews] = useState([]);
	const [summary, setSummary] = useState({ averageRating: null, reviewCount: 0 });
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [rating, setRating] = useState(5);
	const [content, setContent] = useState('');

	const normalizedRoadmapId = useMemo(() => String(roadmapId || '').trim(), [roadmapId]);

	useEffect(() => {
		let isActive = true;

		async function loadReviews() {
			if (!normalizedRoadmapId) {
				setReviews([]);
				setSummary({ averageRating: null, reviewCount: 0 });
				return;
			}

			try {
				setLoading(true);
				const payload = await reviewApi.listRoadmapReviews({ roadmapId: normalizedRoadmapId, page: 1, limit: PAGE_SIZE });
				if (!isActive) return;
				setReviews(Array.isArray(payload?.items) ? payload.items : []);
				setSummary(payload?.summary || { averageRating: null, reviewCount: 0 });
				setHasMore(Boolean(payload?.pagination?.hasMore));
				setPage(1);
			} catch (error) {
				if (isActive) {
					addNotification(error?.message || 'Không tải được đánh giá.', 'error');
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		}

		loadReviews();

		return () => {
			isActive = false;
		};
	}, [addNotification, normalizedRoadmapId]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!normalizedRoadmapId) {
			return;
		}

		try {
			setSaving(true);
			const payload = await reviewApi.submitReview(accessToken, {
				roadmapId: normalizedRoadmapId,
				rating,
				content,
			});
			const submittedReview = payload?.review;
			if (submittedReview) {
				setReviews((prev) => {
					const next = prev.filter((item) => String(item?._id || '') !== String(submittedReview._id || ''));
					return [submittedReview, ...next].slice(0, PAGE_SIZE);
				});
			}
			addNotification(payload?.message || 'Đã gửi đánh giá.', 'success');
			setContent('');
		} catch (error) {
			addNotification(error?.message || 'Không thể gửi đánh giá.', 'error');
		} finally {
			setSaving(false);
		}
	};

	if (!normalizedRoadmapId) {
		return null;
	}

	return (
		<section className="review-tab" aria-label="Roadmap reviews">
			<div className="review-tab__summary">
				<div>
					<h4 className="review-tab__heading">Reviews</h4>
					<p className="review-tab__meta">
						{summary.averageRating == null ? 'Chưa có đánh giá' : `Average ${summary.averageRating.toFixed(1)} / 5`}
					</p>
				</div>
				<StarRow rating={Math.round(summary.averageRating || 0)} disabled />
			</div>

			{isAuthenticated ? (
				<form className="review-tab__form" onSubmit={handleSubmit}>
					<label className="review-tab__label">
						Your rating
						<StarRow rating={rating} onChange={setRating} disabled={saving} />
					</label>
					<label className="review-tab__label">
						Your comment
						<textarea
							className="review-tab__textarea"
							value={content}
							onChange={(event) => setContent(event.target.value)}
							rows={4}
							placeholder="Share what worked well for you..."
						/>
					</label>
					<button type="submit" className="review-tab__submit" disabled={saving}>
						{saving ? 'Submitting...' : 'Submit review'}
					</button>
				</form>
			) : (
				<div className="review-tab__login-prompt">
					<p>Đăng nhập để viết đánh giá cho roadmap này.</p>
					<a href="/login" className="review-tab__login-link">Đăng nhập</a>
				</div>
			)}

			<div className="review-tab__list">
				{loading ? (
					<p className="review-tab__empty">Loading reviews...</p>
				) : reviews.length === 0 ? (
					<p className="review-tab__empty">Chưa có review nào.</p>
				) : (
					reviews.map((item) => (
						<article key={item._id} className="review-card">
							<div className="review-card__header">
								<div>
									<strong>{item.studentDisplayName || 'UET Student'}</strong>
									<div className="review-card__date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</div>
								</div>
								<StarRow rating={item.rating || 0} disabled />
							</div>
							<p className="review-card__content">{item.content}</p>
						</article>
					))
				)}
			</div>

			{hasMore ? (
				<button type="button" className="review-tab__more">Load more</button>
			) : null}
		</section>
	);
}