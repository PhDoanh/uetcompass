import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Save, Sparkles, User, GraduationCap } from 'lucide-react';
import authApi from '../../services/auth.api';
import { useAuth } from '../../providers/AuthProvider';
import { getCourseCatalog } from '../../services/onboarding.api';
import SiteFooter from '../general/SiteFooter';
import './onboarding-panel.css';

function mapCompletedCourses(major, completedCourseIds = [], catalogByMajor = {}) {
	if (!major) {
		return [];
	}

	const options = Array.isArray(catalogByMajor?.[major]) ? catalogByMajor[major] : [];
	const byCourseCode = new Map(options.map((item) => [String(item.courseCode || '').trim(), item]));
	const byCourseUnitId = new Map(options.map((item) => [String(item.courseUnitId || '').trim(), item]));

	const unique = new Map();
	for (const rawId of completedCourseIds) {
		const nextId = String(rawId || '').trim();
		if (!nextId) {
			continue;
		}

		const fromCode = byCourseCode.get(nextId);
		const fromUnitId = byCourseUnitId.get(nextId);
		const resolved = fromCode || fromUnitId;

		const courseCode = resolved?.courseCode ? String(resolved.courseCode).trim() : nextId;
		const courseUnitId = resolved?.courseUnitId ? String(resolved.courseUnitId).trim() : undefined;
		const key = `${major}::${courseCode}`;

		unique.set(key, {
			major,
			courseCode,
			...(courseUnitId ? { courseUnitId } : {}),
		});
	}

	return [...unique.values()];
}

function mapProfileToOnboardingForm(profile, catalogByMajor = {}) {
	const source = profile?.profile || {};
	const major = String(source?.major || '').trim();
	const completedCourseIds = Array.isArray(source?.completedCourseIds) ? source.completedCourseIds : [];
	const careerGoal = source?.careerGoal || {};

	return {
		major,
		completedCourses: mapCompletedCourses(major, completedCourseIds, catalogByMajor),
		careerGoal: {
			role: String(careerGoal?.role || '').trim(),
			companyType: String(careerGoal?.companyType || '').trim(),
			graduationTimeline: String(careerGoal?.graduationTimeline || '').trim(),
		},
		personalAspirations: String(source?.personalAspirations || '').trim(),
	};
}

function serializeProfileForm(profile = {}) {
	const major = String(profile?.major || '').trim();
	const completedCourses = Array.isArray(profile?.completedCourses) ? profile.completedCourses : [];
	const completedCourseIds = completedCourses
		.map((item) => item?.courseUnitId || item?.courseCode)
		.filter(Boolean)
		.sort();

	return JSON.stringify({
		major,
		completedCourseIds,
		careerGoal: {
			role: String(profile?.careerGoal?.role || '').trim(),
			companyType: String(profile?.careerGoal?.companyType || '').trim(),
			graduationTimeline: String(profile?.careerGoal?.graduationTimeline || '').trim(),
		},
		personalAspirations: String(profile?.personalAspirations || '').trim(),
	});
}

export default function LearningProfilePage() {
	const { accessToken, logoutAndRedirect } = useAuth();
	const [form, setForm] = useState(mapProfileToOnboardingForm(null, {}));
	const [initialSerialized, setInitialSerialized] = useState(() => serializeProfileForm(mapProfileToOnboardingForm(null, {})));
	const [identity, setIdentity] = useState({
		displayName: 'Sinh viên UET',
		avatarUrl: '',
	});
	const [avatarBroken, setAvatarBroken] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [statusError, setStatusError] = useState('');
	const [saving, setSaving] = useState(false);
	const [showRegenRoadmap, setShowRegenRoadmap] = useState(false);
	const [showAllCourses, setShowAllCourses] = useState(false);

	const [catalogLoading, setCatalogLoading] = useState(true);
	const [catalogError, setCatalogError] = useState('');
	const [catalogMajors, setCatalogMajors] = useState([]);
	const [catalogByMajor, setCatalogByMajor] = useState({});
	const [roleOptionsByMajor, setRoleOptionsByMajor] = useState({});
	const [requiredCourseLinks, setRequiredCourseLinks] = useState({});

	const currentSerialized = useMemo(() => serializeProfileForm(form), [form]);
	const hasChanges = currentSerialized !== initialSerialized;
	const courseOptions = useMemo(() => catalogByMajor[form.major] || [], [catalogByMajor, form.major]);
	const roleOptions = useMemo(() => roleOptionsByMajor[form.major] || [], [roleOptionsByMajor, form.major]);
	const requiredCourseLink = useMemo(() => requiredCourseLinks[form.major] || null, [requiredCourseLinks, form.major]);
	const selectedCourseKeys = useMemo(
		() => new Set((form.completedCourses || []).map((item) => `${item.major}::${item.courseCode}`)),
		[form.completedCourses]
	);
	const visibleCourseOptions = useMemo(() => (showAllCourses ? courseOptions : courseOptions.slice(0, 6)), [courseOptions, showAllCourses]);
	const graduationLabel = useMemo(() => {
		const raw = String(form?.careerGoal?.graduationTimeline || '').trim();
		if (!raw) {
			return 'Chưa cập nhật';
		}

		const [year, month] = raw.split('-').map((part) => Number(part));
		if (!year || !month) {
			return raw;
		}

		return `Tháng ${month}, ${year}`;
	}, [form?.careerGoal?.graduationTimeline]);
	const completionPercent = useMemo(() => {
		if (!courseOptions.length) {
			return 0;
		}
		return Math.min(100, Math.round(((form.completedCourses || []).length / courseOptions.length) * 100));
	}, [courseOptions.length, form.completedCourses]);

	const patchForm = (next) => {
		setForm(next);
		setStatusMessage('');
		setStatusError('');
	};

	const handleMajorChange = (major) => {
		const nextRoleOptions = roleOptionsByMajor[major] || [];
		const currentRole = form?.careerGoal?.role || '';
		const keepRole = currentRole && nextRoleOptions.includes(currentRole);

		patchForm({
			...form,
			major,
			completedCourses: major === form.major ? form.completedCourses : [],
			careerGoal: {
				...(form.careerGoal || {}),
				role: keepRole ? currentRole : '',
			},
		});
	};

	const handleToggleCourse = (course) => {
		const key = `${form.major}::${course.courseCode}`;
		const selected = new Set(selectedCourseKeys);
		if (selected.has(key)) {
			selected.delete(key);
		} else {
			selected.add(key);
		}

		const next = courseOptions
			.filter((item) => selected.has(`${form.major}::${item.courseCode}`))
			.map((item) => ({ major: form.major, courseCode: item.courseCode, courseUnitId: item.courseUnitId }));

		patchForm({
			...form,
			completedCourses: next,
		});
	};

	const handleSaveProfile = async () => {
		setStatusMessage('');
		setStatusError('');
		setSaving(true);

		const major = String(form?.major || '').trim();
		const completedCourses = Array.isArray(form?.completedCourses) ? form.completedCourses : [];
		const completedCourseIds = completedCourses
			.map((item) => item?.courseUnitId || item?.courseCode)
			.filter(Boolean);

		try {
			await authApi.patchProfile(accessToken, {
				profile: {
					major,
					completedCourseIds,
					careerGoal: {
						role: String(form?.careerGoal?.role || '').trim(),
						companyType: String(form?.careerGoal?.companyType || '').trim(),
						graduationTimeline: String(form?.careerGoal?.graduationTimeline || '').trim(),
					},
					personalAspirations: String(form?.personalAspirations || '').trim(),
				},
			});

			setInitialSerialized(serializeProfileForm(form));
			setShowRegenRoadmap(true);
			setStatusMessage('Save profile thành công.');
		} catch (err) {
			if (err?.status === 401) {
				await logoutAndRedirect();
				return;
			}

			setStatusError(err?.message || 'Lưu profile thất bại.');
		} finally {
			setSaving(false);
		}
	};

	const handleRegenRoadmap = () => {
		setStatusError('');
		setStatusMessage('Đã gửi yêu cầu Regen Roadmap thành công (tạm thời).');
	};

	useEffect(() => {
		let isMounted = true;

		async function loadData() {
			if (!accessToken) {
				if (isMounted) {
					setLoading(false);
					setCatalogLoading(false);
				}
				return;
			}

			setLoading(true);
			setCatalogLoading(true);
			setError('');
			setCatalogError('');

			try {
				const [profilePayload, catalogPayload] = await Promise.all([
					authApi.getProfile(accessToken),
					getCourseCatalog(accessToken),
				]);

				if (isMounted) {
					const identityPayload = profilePayload?.identity || {};
					setAvatarBroken(false);
					setIdentity({
						displayName: String(identityPayload.displayName || identityPayload.fullName || 'Sinh viên UET').trim(),
						avatarUrl: String(identityPayload.avatarUrl || '').trim(),
					});

					const nextCatalogByMajor =
						catalogPayload?.courseCatalog && typeof catalogPayload.courseCatalog === 'object'
							? catalogPayload.courseCatalog
							: {};
					const mapped = mapProfileToOnboardingForm(profilePayload, nextCatalogByMajor);

					setForm(mapped);
					setInitialSerialized(serializeProfileForm(mapped));
					setCatalogMajors(Array.isArray(catalogPayload?.majors) ? catalogPayload.majors : []);
					setCatalogByMajor(nextCatalogByMajor);
					setRoleOptionsByMajor(catalogPayload?.roleOptionsByMajor && typeof catalogPayload.roleOptionsByMajor === 'object' ? catalogPayload.roleOptionsByMajor : {});
					setRequiredCourseLinks(catalogPayload?.requiredCourseLinks && typeof catalogPayload.requiredCourseLinks === 'object' ? catalogPayload.requiredCourseLinks : {});
				}
			} catch (err) {
				if (err?.status === 401) {
					await logoutAndRedirect();
					return;
				}

				if (isMounted) {
					setError(err?.message || 'Failed to load learning profile.');
					setCatalogError(err?.message || 'Failed to load catalog.');
					setIdentity({ displayName: 'Sinh viên UET', avatarUrl: '' });
				}
			} finally {
				if (isMounted) {
					setLoading(false);
					setCatalogLoading(false);
				}
			}
		}

		loadData();

		return () => {
			isMounted = false;
		};
	}, [accessToken, logoutAndRedirect]);

	return (
		<main className="learning-profile-page learning-profile-page--modern">
			{loading ? <div style={{ marginBottom: 12 }}>Loading learning profile...</div> : null}
			{error ? <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div> : null}
			{!loading && !error ? (
				<>
				<section className="learning-profile-content learning-profile-content--modern">
					<section className="learning-profile-header">
						<span className="learning-profile-badge">Hồ sơ sinh viên</span>
						<div className="learning-profile-avatar-wrap">
							<div className="learning-profile-avatar-ring">
								{identity.avatarUrl && !avatarBroken ? (
									<img
										src={identity.avatarUrl}
										alt={identity.displayName}
										className="learning-profile-avatar"
										onError={() => setAvatarBroken(true)}
									/>
								) : (
									<div className="learning-profile-avatar learning-profile-avatar--fallback">
										{identity.displayName.charAt(0).toUpperCase() || 'U'}
									</div>
								)}
							</div>
						</div>
						<h1>{identity.displayName}</h1>
						<p>{form.major || 'Chưa chọn ngành học'}</p>
					</section>

					{catalogLoading ? <div className="onboarding-panel-note">Loading majors and courses...</div> : null}
					{catalogError ? <div className="onboarding-panel-error">{catalogError}</div> : null}

					<div className="learning-profile-sections">
						<section className="learning-section">
							<div className="learning-section__head">
								<User size={18} />
								<h2>Thông tin cá nhân</h2>
							</div>
							<div className="learning-section__card learning-grid-two">
								<div className="learning-field">
									<label htmlFor="major" className="learning-label">Ngành học</label>
									<select
										id="major"
										value={form.major || ''}
										onChange={(event) => handleMajorChange(event.target.value)}
										className="learning-input learning-select"
									>
										<option value="">Chọn ngành học</option>
										{catalogMajors.map((major) => (
											<option key={major} value={major}>{major}</option>
										))}
									</select>
								</div>

								<div className="learning-field">
									<label htmlFor="target-role" className="learning-label">Mục tiêu nghề nghiệp</label>
									<select
										id="target-role"
										value={form?.careerGoal?.role || ''}
										onChange={(event) =>
											patchForm({
												...form,
												careerGoal: {
													...(form.careerGoal || {}),
													role: event.target.value,
												},
											})
										}
										disabled={!form.major || roleOptions.length === 0}
										className="learning-input learning-select"
									>
										<option value="">
											{form.major
												? roleOptions.length
													? 'Chọn vai trò mục tiêu'
													: 'Không có role cho ngành đã chọn'
												: 'Chọn ngành học trước'}
										</option>
										{roleOptions.map((item) => (
											<option key={item} value={item}>{item}</option>
										))}
									</select>
								</div>
							</div>
						</section>

						<section className="learning-section">
							<div className="learning-section__head">
								<BookOpenCheck size={18} />
								<h2>Các môn đã học</h2>
							</div>

							{!form.major ? (
								<div className="learning-section__empty">Hãy chọn ngành học để hiển thị danh sách môn học.</div>
							) : courseOptions.length === 0 ? (
								<div className="learning-section__empty">
									Không có dữ liệu môn học tự chọn cho ngành này.
									{requiredCourseLink ? (
										<a href={requiredCourseLink} target="_blank" rel="noreferrer">Xem danh sách môn học bắt buộc</a>
									) : null}
								</div>
							) : (
								<>
									<div className="learning-course-list">
										{visibleCourseOptions.map((course) => {
											const key = `${form.major}::${course.courseCode}`;
											const checked = selectedCourseKeys.has(key);
											return (
												<label key={key} className="learning-course-item">
													<div>
														<h3>{course.name || course.courseCode}</h3>
														<p>
															{course.courseCode}
															{course.credit ? ` • ${course.credit} Tín chỉ` : ''}
														</p>
													</div>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => handleToggleCourse(course)}
													/>
												</label>
											);
										})}
									</div>

									{courseOptions.length > 6 ? (
										<button
											type="button"
											className="learning-expand-btn"
											onClick={() => setShowAllCourses((prev) => !prev)}
										>
											{showAllCourses ? 'Thu gọn danh sách môn học' : 'Xem toàn bộ môn học'}
										</button>
									) : null}
								</>
							)}
						</section>

						<section className="learning-section">
							<div className="learning-section__head">
								<GraduationCap size={18} />
								<h2>Dự kiến tốt nghiệp</h2>
							</div>
							<div className="learning-grad-card">
								<div className="onboarding-field">
									<label htmlFor="timeline" className="onboarding-label">Thời gian dự kiến</label>
									<input
										type="date"
										id="timeline"
										value={form?.careerGoal?.graduationTimeline || ''}
										onChange={(event) =>
											patchForm({
												...form,
												careerGoal: {
													...(form.careerGoal || {}),
													graduationTimeline: event.target.value,
												},
											})
										}
										className="onboarding-input"
									/>
								</div>

								<p className="learning-grad-card__meta">Mốc thời gian hiện tại</p>
								<p className="learning-grad-card__date">{graduationLabel}</p>
								<div className="learning-progress-row">
									<div className="learning-progress-bar">
										<span style={{ width: `${completionPercent}%` }} />
									</div>
									<strong>{completionPercent}%</strong>
								</div>
							</div>
						</section>
					</div>

					<div className="learning-profile-actions">
						{hasChanges ? (
							<button type="button" className="primary-btn" onClick={handleSaveProfile} disabled={saving}>
								<Save size={17} />
								{saving ? 'Đang lưu...' : 'Lưu thông tin'}
							</button>
						) : null}
						{showRegenRoadmap ? (
							<button type="button" className="secondary-btn" onClick={handleRegenRoadmap}>
								<Sparkles size={17} />
								Tạo lại Roadmap
							</button>
						) : null}
					</div>

					{statusError ? <div className="onboarding-panel-error">{statusError}</div> : null}
					{statusMessage ? <div className="learning-profile-success">{statusMessage}</div> : null}
				</section>
				<SiteFooter />
				</>
			) : null}
		</main>
	);
}