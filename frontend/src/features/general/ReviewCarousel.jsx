import React, { useEffect, useMemo, useRef, useState } from 'react';
import reviewApi from '../../services/review.api';
import { Star } from 'lucide-react';

const SCROLL_SPEED = 0.05;

function ReviewCard({ review }) {
	return (
		<article className="review-carousel__card">
			<div className="review-carousel__header">
				<div className="review-carousel__author">
					<div className="review-carousel__author-avatar">
						{review?.avatarUrl ? (
							<img src={review?.avatarUrl} alt="Ảnh đại diện người chia sẻ" className="review-carousel__avatar-img" />
						) : (
							<span>{(review?.studentDisplayName?.charAt(0) || 'U').toUpperCase()}</span>
						)}
					</div>
					<div className="review-carousel__author-info">
						<span className="review-carousel__author-name">{review?.studentDisplayName || 'Sinh viên UET'}</span>
						<p className="review-carousel__roadmap-name">{review?.roadmapName || 'Lộ trình không xác định'}</p>
					</div>
				</div>
				<div className="review-carousel__rating">
					<span className="review-carousel__rating-value">{review?.rating || 0}</span>
					<Star className='review-carousel__star review-carousel__star--active' size={16}/>
				</div>
			</div>
			<p className="review-carousel__content">{review?.content || ''}</p>
		</article>
	);
}

export default function ReviewCarousel({ visible = true }) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(false);
	const forwardRowRef = useRef(null);
	const reverseRowRef = useRef(null);
	const animationRef = useRef(null);
	const pauseRef = useRef(false);
	const dragStateRef = useRef({ active: false, startX: 0, startScroll: 0, pointerId: null });

	useEffect(() => {
		let isActive = true;
		async function loadCarousel() {
			try {
				setLoading(true);
				const payload = await reviewApi.listCarouselReviews();
				if (!isActive) return;
				setItems(Array.isArray(payload?.items) ? payload.items : []);
			} catch {
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

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
			return;
		}

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => setReduceMotion(media.matches);
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	}, []);

	useEffect(() => {
		pauseRef.current = isPaused;
	}, [isPaused]);

	useEffect(() => {
		const reverseRow = reverseRowRef.current;
		if (!reverseRow) {
			return;
		}

		const setInitialOffset = () => {
			reverseRow.scrollLeft = reverseRow.scrollWidth / 2;
		};

		setInitialOffset();
		const rafId = window.requestAnimationFrame(setInitialOffset);
		return () => window.cancelAnimationFrame(rafId);
	}, [visible, items.length]);

	useEffect(() => {
		if (!visible || reduceMotion) {
			return;
		}

		const forwardRow = forwardRowRef.current;
		const reverseRow = reverseRowRef.current;
		if (!forwardRow || !reverseRow) {
			return;
		}

		let lastTime = performance.now();

		const tick = (time) => {
			const delta = time - lastTime;
			lastTime = time;

			if (!pauseRef.current) {
				const forwardLimit = forwardRow.scrollWidth / 2;
				const reverseLimit = reverseRow.scrollWidth / 2;

				forwardRow.scrollLeft += delta * SCROLL_SPEED;
				reverseRow.scrollLeft -= delta * SCROLL_SPEED;

				if (forwardRow.scrollLeft >= forwardLimit) {
					forwardRow.scrollLeft -= forwardLimit;
				}

				if (reverseRow.scrollLeft <= 0) {
					reverseRow.scrollLeft += reverseLimit;
				}
			}

			animationRef.current = window.requestAnimationFrame(tick);
		};

		animationRef.current = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(animationRef.current);
	}, [reduceMotion, visible]);

	const trackItems = useMemo(() => items.slice(0, 20), [items]);
	const loopItems = useMemo(() => (trackItems.length ? [...trackItems, ...trackItems] : []), [trackItems]);
	if (!visible) {
		return null;
	}

	const handlePointerDown = (event, rowRef) => {
		const row = rowRef.current;
		if (!row) {
			return;
		}

		dragStateRef.current = {
			active: true,
			startX: event.clientX,
			startScroll: row.scrollLeft,
			pointerId: event.pointerId,
		};
		row.setPointerCapture(event.pointerId);
		setIsDragging(true);
		setIsPaused(true);
	};

	const handlePointerMove = (event, rowRef) => {
		const row = rowRef.current;
		const dragState = dragStateRef.current;
		if (!row || !dragState.active) {
			return;
		}

		const deltaX = event.clientX - dragState.startX;
		row.scrollLeft = dragState.startScroll - deltaX;
	};

	const handlePointerUp = (event, rowRef) => {
		const row = rowRef.current;
		const dragState = dragStateRef.current;
		if (!row || !dragState.active) {
			setIsPaused(false);
			setIsDragging(false);
			return;
		}

		row.releasePointerCapture(dragState.pointerId);
		dragStateRef.current = { active: false, startX: 0, startScroll: 0, pointerId: null };
		setIsDragging(false);
		setIsPaused(false);
	};

	return (
		<section className="review-carousel" aria-label="User reviews">
			<div className="review-carousel__head">
				<h2>Người dùng nói gì về UETCompass?</h2>
				<p>Các đánh giá hàng đầu từ cộng đồng UET.</p>
			</div>

			<div className={`review-carousel__viewport${isDragging ? ' review-carousel__viewport--dragging' : ''}`}>
				{loading && trackItems.length === 0 ? <p className="review-carousel__empty">Đang tải đánh giá...</p> : null}
				<div
					className="review-carousel__row"
					ref={forwardRowRef}
					role="region"
					onPointerDown={(event) => handlePointerDown(event, forwardRowRef)}
					onPointerMove={(event) => handlePointerMove(event, forwardRowRef)}
					onPointerUp={(event) => handlePointerUp(event, forwardRowRef)}
					onPointerCancel={(event) => handlePointerUp(event, forwardRowRef)}
					onPointerLeave={(event) => handlePointerUp(event, forwardRowRef)}
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
					onFocus={() => setIsPaused(true)}
					onBlur={() => setIsPaused(false)}
					aria-label="Hàng đánh giá số 1"
					tabIndex={0}
				>
					<div className="review-carousel__track review-carousel__track--forward">
						{loopItems.map((review, index) => (
							<ReviewCard key={`${review.reviewId || review._id}-${index}`} review={review} />
						))}
					</div>
				</div>
				<div
					className="review-carousel__row"
					ref={reverseRowRef}
					role="region"
					onPointerDown={(event) => handlePointerDown(event, reverseRowRef)}
					onPointerMove={(event) => handlePointerMove(event, reverseRowRef)}
					onPointerUp={(event) => handlePointerUp(event, reverseRowRef)}
					onPointerCancel={(event) => handlePointerUp(event, reverseRowRef)}
					onPointerLeave={(event) => handlePointerUp(event, reverseRowRef)}
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
					onFocus={() => setIsPaused(true)}
					onBlur={() => setIsPaused(false)}
					aria-label="Hàng đánh giá số 2"
					tabIndex={0}
				>
					<div className="review-carousel__track review-carousel__track--reverse" aria-hidden="true">
						{loopItems.map((review, index) => (
							<ReviewCard key={`reverse-${review.reviewId || review._id}-${index}`} review={review} />
						))}
					</div>
				</div>
			</div>
		</section>
	);
}