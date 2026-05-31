import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Compass, Star, UserPlus, Users } from 'lucide-react';
import accountApi from '../../services/account.api';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import { useNotification } from '../notification/NotificationContainer';
import { useAuth } from '../../providers/AuthProvider';
import { navigateTo } from '../../shared/navigation';
import '../../style/general-component.css';
import './public-profile-page.css';

const PAGE_SIZE = 6;
const STAR_COUNT = 5;

function safeText(value, fallback = '') {
	if (typeof value === 'string') {
		return value.trim() || fallback;
	}

	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}

	return fallback;
}

function toRelativeDays(startDate) {
	const date = new Date(startDate);
	if (Number.isNaN(date.getTime())) {
		return 0;
	}

	const diff = Date.now() - date.getTime();
	return Math.max(0, Math.floor(diff / 86400000));
}

function average(numbers) {
	const values = numbers.filter((value) => Number.isFinite(value));
	if (values.length === 0) {
		return 0;
	}

	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSeed(source) {
	const normalizedSource = safeText(source, 'u');
	return Array.from(normalizedSource, (char) => char.charCodeAt(0)).reduce((sum, value) => sum + value, 0);
}

function buildGradient(seed) {
	const palette = [
		'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 48%, #F97316 100%)',
		'linear-gradient(135deg, #155E75 0%, #0EA5E9 55%, #67E8F9 100%)',
		'linear-gradient(135deg, #0F766E 0%, #14B8A6 52%, #A7F3D0 100%)',
		'linear-gradient(135deg, #1D4ED8 0%, #6366F1 55%, #A5B4FC 100%)',
		'linear-gradient(135deg, #B45309 0%, #F97316 52%, #FDBA74 100%)',
	];

	return palette[seed % palette.length];
}

function formatDuration(minutes) {
	const safeMinutes = Math.max(2, Math.round(minutes || 0));
	return `${safeMinutes} phút đọc`;
}

function formatStarRating(value) {
	return Math.max(0, Math.min(STAR_COUNT, Number(value) || 0));
}

function normalizeTags(item) {
	const tags = [];
	if (Array.isArray(item?.tags)) {
		for (const tag of item.tags) {
			if (typeof tag === 'string') {
				tags.push(tag.trim());
				continue;
			}
			if (tag && typeof tag === 'object') {
				tags.push(safeText(tag.label ?? tag.name ?? tag.normalizedLabel));
			}
		}
	}

	if (item?.isPrimary) {
		tags.unshift('Primary');
	}

	if (item?.status) {
		tags.push(safeText(item.status));
	}

	if (item?.personalisationLevel) {
		tags.push(item.personalisationLevel === 'full' ? 'Cá nhân hóa sâu' : 'Gợi ý nhanh');
	}

	return [...new Set(tags.filter(Boolean))].slice(0, 3);
}

function uniqueById(items) {
	const seenIds = new Set();
	const uniqueItems = [];

	for (const item of Array.isArray(items) ? items : []) {
		const id = safeText(item?._id);
		if (!id || seenIds.has(id)) {
			continue;
		}

		seenIds.add(id);
		uniqueItems.push(item);
	}

	return uniqueItems;
}

function resolveUserIdFromLocation(fallbackUserId = '') {
	const direct = typeof fallbackUserId === 'string' ? fallbackUserId.trim() : '';
	if (direct) {
		return direct;
	}

	if (typeof window === 'undefined') {
		return '';
	}

	const match = safeText(window.location.pathname).match(/^\/public-profile\/([^/]+)$/);
	return match ? decodeURIComponent(match[1]) : '';
}

function normalizeManualRoadmap(item, authorName, authorAvatar) {
	const title = safeText(item?.title, 'Manual roadmap');
	const description = safeText(item?.description, 'Lộ trình cộng đồng được chia sẻ để người khác tham khảo và học theo.');
	const roadmapId = safeText(item?._id, '');
	return {
		id: `manual-${roadmapId || title}`,
		roadmapId,
		type: 'manual',
		title,
		description,
		tags: normalizeTags(item),
		rating: Number(item?.averageRating || 0) || 0,
		updatedAt: item?.sharedAt || item?.updatedAt || item?.createdAt || null,
		readingTime: formatDuration(Math.max(2, Math.ceil((description.split(/\s+/).filter(Boolean).length + title.length / 8) / 16))),
		authorName,
		authorAvatar,
		thumbnailSeed: buildSeed(title),
	};
}

function RatingStrip({ value }) {
	const rating = formatStarRating(value);
	return (
		<div className="public-profile-page__rating-strip" aria-label={`Đánh giá trung bình ${rating} trên 5`}>
			{Array.from({ length: STAR_COUNT }).map((_, index) => (
				<Star key={index} size={14} fill={index + 1 <= rating ? 'currentColor' : 'none'} aria-hidden="true" />
			))}
			<strong>{rating.toFixed(1)}</strong>
		</div>
	);
}

function RoadmapCard({ item }) {
	const handleOpenRoadmap = () => {
		if (!item?.roadmapId) {
			return;
		}

		navigateTo(`/skill-tree/${encodeURIComponent(item.roadmapId)}`);
	};

	const handleKeyDown = (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleOpenRoadmap();
		}
	};

	return (
		<article
			className="public-profile-card public-profile-card--roadmap"
			onClick={handleOpenRoadmap}
			onKeyDown={handleKeyDown}
			tabIndex={0}
			role="link"
			aria-label={`Mở roadmap ${item.title}`}
		>
			<div className="public-profile-card__thumbnail" style={{ background: buildGradient(item.thumbnailSeed) }}>
				<div className="public-profile-card__thumbnail-badge">
					<Compass size={18} aria-hidden="true" />
					<span>{item.type === 'manual' ? 'Public' : 'Personal'}</span>
				</div>
				<div className="public-profile-card__thumbnail-title">{item.title}</div>
			</div>
			<div className="public-profile-card__tags">
				{item.tags.length > 0 ? item.tags.map((tag, index) => <span key={`${item.id}-tag-${index}`}>{tag}</span>) : <span>Không có tag</span>}
			</div>
			<div className="public-profile-card__title-row">
				<h3>{item.title}</h3>
				<RatingStrip value={item.rating} />
			</div>
			<p className="public-profile-card__description">{item.description}</p>
			<footer className="public-profile-card__footer">
				<span>{item.readingTime}</span>
				<div className="public-profile-card__author">
					<div className="public-profile-card__author-avatar" aria-hidden="true">
						{safeText(item.authorName, 'U').charAt(0).toUpperCase()}
					</div>
					<div>
						<strong>{item.authorName}</strong>
						<span>Tác giả</span>
					</div>
				</div>
			</footer>
		</article>
	);
}

export default function PublicProfilePage({ userId }) {
	const { accessToken, isAuthenticated } = useAuth();
	const notificationApi = useNotification();
	const addNotification = notificationApi?.addNotification || (() => {});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [pageIndex, setPageIndex] = useState(0);
	const [profile, setProfile] = useState(null);
	const [roadmaps, setRoadmaps] = useState([]);
	const [isFollowingLoading, setIsFollowingLoading] = useState(false);

	useEffect(() => {
		let alive = true;
		const resolvedUserId = resolveUserIdFromLocation(userId);

		async function loadProfile() {
			if (!resolvedUserId) {
				setError('Thiếu id hồ sơ công khai.');
				setLoading(false);
				return;
			}

			setLoading(true);
			setError('');

			try {
				const [profilePayload, manualPayload] = await Promise.all([
					accountApi.getPublicProfile(resolvedUserId, accessToken),
					manualRoadmapApi.listPublicManualRoadmaps({ userId: resolvedUserId, page: 1, limit: 100 }),
				]);

				if (!alive) {
					return;
				}

				const identity = profilePayload?.identity || {};
				const visible = profilePayload?.visible !== false && identity?.privacySetting !== 'anonymous';
				const displayName = safeText(identity.effectiveDisplayName || identity.displayName || identity.fullName, 'Sinh viên UET');
				const avatarUrl = safeText(identity.avatarUrl, '');
				const manualRoadmaps = uniqueById(manualPayload?.items);
				const combined = manualRoadmaps.map((item) => normalizeManualRoadmap(item, displayName, avatarUrl)).sort((left, right) => {
					const leftTime = new Date(left.updatedAt || 0).getTime();
					const rightTime = new Date(right.updatedAt || 0).getTime();
					return rightTime - leftTime;
				});

				setProfile({
					userId: resolvedUserId,
					visible,
					identity,
					displayName,
					avatarUrl,
					joinedAt: identity.joinedAt || profilePayload?.createdAt || null,
					major: visible ? safeText(profilePayload?.profile?.major, 'Chưa cập nhật') : '',
					careerGoalRole: visible ? safeText(profilePayload?.profile?.careerGoal?.role, 'Chưa cập nhật') : '',
					roadmapCount: combined.length,
					averageRating: average(combined.map((item) => item.rating)),
					followers: Number(profilePayload?.followersCount ?? identity?.followersCount ?? 0) || 0,
					following: Number(profilePayload?.followingCount ?? identity?.followingCount ?? 0) || 0,
					isFollowing: Boolean(profilePayload?.viewerIsFollowing),
					isSelf: Boolean(profilePayload?.viewerIsSelf),
				});
				setRoadmaps(combined);
				setPageIndex(0);
			} catch (loadError) {
				if (!alive) {
					return;
				}

				setError(loadError?.message || 'Không thể tải trang cá nhân.');
				setProfile(null);
				setRoadmaps([]);
			}

			if (alive) {
				setLoading(false);
			}
		}

		loadProfile();

		return () => {
			alive = false;
		};
		}, [accessToken, userId]);

	const totalPages = Math.max(1, Math.ceil(roadmaps.length / PAGE_SIZE));
	const safePageIndex = Math.min(pageIndex, totalPages - 1);
	const visibleRoadmaps = useMemo(
		() => roadmaps.slice(safePageIndex * PAGE_SIZE, safePageIndex * PAGE_SIZE + PAGE_SIZE),
		[roadmaps, safePageIndex]
	);
	const joinedLabel = profile?.joinedAt ? `${toRelativeDays(profile.joinedAt)} ngày` : 'Chưa xác định';
	const topRating = formatStarRating(profile?.averageRating || 0);

	useEffect(() => {
		if (pageIndex !== safePageIndex) {
			setPageIndex(safePageIndex);
		}
	}, [pageIndex, safePageIndex]);

	const handleFollow = async () => {
		if (!profile?.userId || !isAuthenticated || !accessToken) {
			addNotification('Vui lòng đăng nhập để theo dõi.', 'warning');
			return;
		}

		if (profile?.isSelf) {
			return;
		}

		if (profile?.isFollowing) {
			addNotification('Bạn đã theo dõi hồ sơ này rồi.', 'info');
			return;
		}

		setIsFollowingLoading(true);

		try {
			const result = profile?.isFollowing
				? await accountApi.unfollowPublicProfile(accessToken, profile.userId)
				: await accountApi.followPublicProfile(accessToken, profile.userId);
			setProfile((current) => ({
				...(current || {}),
				followers: Number(result?.followersCount ?? current?.followers ?? 0) || 0,
				following: Number(result?.followingCount ?? current?.following ?? 0) || 0,
				isFollowing: Boolean(result?.isFollowing ?? !current?.isFollowing),
			}));
			addNotification(
				result?.message || (profile?.isFollowing ? 'Đã bỏ theo dõi hồ sơ này.' : 'Đã theo dõi hồ sơ này.'),
				'success'
			);
		} catch (error) {
			addNotification(error?.message || 'Không thể cập nhật trạng thái theo dõi lúc này.', 'error');
		} finally {
			setIsFollowingLoading(false);
		}
	};

	return (
		<main className="public-profile-page">
			<section className="public-profile-page__shell">
				{/* header intentionally empty; controls moved into content header for correct placement */}

				<div className="public-profile-page__layout">
					<aside className="public-profile-page__sidebar">
						<section className="public-profile-card public-profile-card--profile">
							{profile?.visible === false ? (
								<div className="public-profile-page__empty-state public-profile-page__empty-state--error">
									Hồ sơ này đang để chế độ ẩn. Chỉ có manual roadmap công khai được hiển thị.
								</div>
							) : (
								<>
									<div className="public-profile-card__profile-top">
										<div className="public-profile-card__avatar-wrap">
											{profile?.avatarUrl ? (
												<img src={profile.avatarUrl} alt="Ảnh đại diện" className="public-profile-card__avatar" />
											) : (
												<div className="public-profile-card__avatar public-profile-card__avatar--fallback">{(profile?.displayName || 'U').charAt(0).toUpperCase()}</div>
											)}
										</div>
										<div>
											<h2>{profile?.displayName || 'Sinh viên UET'}</h2>
											<span className="public-profile-card__meta">{profile?.identity?.email || 'Email chưa cập nhật'}</span>
										</div>
									</div>

									<div className="public-profile-card__detail-grid">
										<div>
											<span>Ngành</span>
											<strong>{profile?.major}</strong>
										</div>
										<div>
											<span>Mục tiêu nghề nghiệp</span>
											<strong>{profile?.careerGoalRole}</strong>
										</div>
									</div>

									<button
										type="button"
										className="public-profile-card__follow-btn"
										onClick={handleFollow}
										disabled={Boolean(profile?.isSelf || isFollowingLoading || !isAuthenticated)}
									>
										<UserPlus size={16} />
										{profile?.isFollowing ? 'Unfollow' : 'Follow'}
									</button>

									<div className="public-profile-card__stats public-profile-card__stats--social">
										<div>
											<strong>{profile?.followers || 0}</strong>
											<span>Followers</span>
										</div>
										<div>
											<strong>{profile?.following || 0}</strong>
											<span>Following</span>
										</div>
									</div>

									<div className="public-profile-card__rating-block">
										<RatingStrip value={topRating} />
										<p>Đánh giá trung bình của toàn bộ roadmap được chia sẻ công khai.</p>
									</div>

									<div className="public-profile-card__stats public-profile-card__stats--text">
										<div>
											<CalendarDays size={16} />
											<span>Số ngày</span>
											<strong>{joinedLabel}</strong>
										</div>
										<div>
											<Users size={16} />
											<span>Manual roadmap</span>
											<strong>{profile?.roadmapCount || 0}</strong>
										</div>
										<div>
											<Star size={16} />
											<span>Đánh giá TB</span>
											<strong>{topRating.toFixed(1)}</strong>
										</div>
									</div>
								</>
							)}
						</section>
					</aside>

					<section className="public-profile-page__content">
						<div className="public-profile-page__content-header">
							<div>
								<p className="public-profile-page__eyebrow">Roadmaps công khai</p>
								<h2>{roadmaps.length > 0 ? 'Danh sách roadmap' : 'Chưa có roadmap công khai'}</h2>
							</div>
							<div className="public-profile-page__header-controls">
								<div className="public-profile-page__hero-actions">
									<button type="button" className="public-profile-page__nav-btn" onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))} disabled={safePageIndex === 0 || loading} aria-label="Trang trước">
										<ChevronLeft size={18} />
									</button>
									<button type="button" className="public-profile-page__nav-btn" onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))} disabled={safePageIndex >= totalPages - 1 || loading} aria-label="Trang sau">
										<ChevronRight size={18} />
									</button>
								</div>
								<span className="public-profile-page__page-indicator">{safePageIndex + 1} / {totalPages}</span>
							</div>
						</div>

						{loading ? (
							<div className="public-profile-page__empty-state">Đang tải dữ liệu hồ sơ...</div>
						) : error ? (
							<div className="public-profile-page__empty-state public-profile-page__empty-state--error">{error}</div>
						) : visibleRoadmaps.length > 0 ? (
							<div className="public-profile-page__grid">
								{visibleRoadmaps.map((item) => (
									<RoadmapCard key={item.id} item={item} />
								))}
							</div>
						) : (
							<div className="public-profile-page__empty-state">Người dùng này chưa công khai manual roadmap nào.</div>
						)}
					</section>
				</div>
			</section>
		</main>
	);
}