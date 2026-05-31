import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Save, Sparkles, User, GraduationCap, Camera, Calendar } from 'lucide-react';
import authApi from '../../services/auth.api';
import accountApi from '../../services/account.api';
import { retryRoadmapGeneration } from '../../services/roadmap.api';
import { useAuth } from '../../providers/AuthProvider';
import { getCourseCatalog } from '../../services/onboarding.api';
import { useNotification } from '../notification/NotificationContainer';
import SiteFooter from '../general/SiteFooter';
import { validateProfilePayload } from '../account/accountSettings.validation';
import { navigateTo } from '../../shared/navigation';
import './onboarding-panel.css';
import '../account/account-settings-page.css';
import DatePicker from '../../shared/DatePicker';

const AVATAR_MAX_DIMENSION = 512;
const AVATAR_MAX_BYTES = 350 * 1024;

function estimateDataUrlBytes(dataUrl) {
	const base64 = String(dataUrl || '').split(',')[1] || '';
	return Math.floor((base64.length * 3) / 4);
}

function loadImageFromFile(file) {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Failed to decode image'));
		};
		image.src = objectUrl;
	});
}

async function compressAvatarFile(file) {
	const image = await loadImageFromFile(file);
	const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(image.width, image.height));
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Canvas is not supported in this browser');
	}

	context.drawImage(image, 0, 0, width, height);

	if (file.type === 'image/png') {
		return canvas.toDataURL('image/png');
	}

	const qualitySteps = [0.86, 0.75, 0.65, 0.55];
	let best = canvas.toDataURL('image/jpeg', qualitySteps[0]);

	for (const quality of qualitySteps) {
		const candidate = canvas.toDataURL('image/jpeg', quality);
		best = candidate;
		if (estimateDataUrlBytes(candidate) <= AVATAR_MAX_BYTES) {
			break;
		}
	}

	return best;
}

function mapCompletedCourses(programId, major, completedCourseIds = [], catalogByProgramId = {}) {
	if (!programId || !major) {
		return [];
	}

	const options = Array.isArray(catalogByProgramId?.[programId]) ? catalogByProgramId[programId] : [];
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

function mapProfileToOnboardingForm(profile, catalogByProgramId = {}, majors = []) {
	const source = profile?.profile || {};
	const major = String(source?.major || '').trim();
	const programIdFromProfile = String(source?.programId || '').trim();
	const inferredProgramId =
		programIdFromProfile ||
		String(majors.find((item) => String(item?.nameEN || '').trim() === major)?.programId || '').trim();
	const completedCourseIds = Array.isArray(source?.completedCourseIds) ? source.completedCourseIds : [];
	const careerGoal = source?.careerGoal || {};

	return {
		programId: inferredProgramId,
		major,
		completedCourses: mapCompletedCourses(inferredProgramId, major, completedCourseIds, catalogByProgramId),
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
	const notificationApi = useNotification();
	const addNotification = notificationApi?.addNotification || (() => {});
	const [form, setForm] = useState(mapProfileToOnboardingForm(null, {}));
	const [initialSerialized, setInitialSerialized] = useState(() => serializeProfileForm(mapProfileToOnboardingForm(null, {})));
	const [identity, setIdentity] = useState({
		email: '',
		displayName: 'Sinh viên UET',
		fullName: '',
		avatarUrl: '',
	});
	const [imageError, setImageError] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [regenerating, setRegenerating] = useState(false);
	const [showRegenRoadmap, setShowRegenRoadmap] = useState(false);

	const [catalogLoading, setCatalogLoading] = useState(true);
	const [catalogMajors, setCatalogMajors] = useState([]);
	const [catalogByProgramId, setCatalogByProgramId] = useState({});
	const [roleOptionsByProgramId, setRoleOptionsByProgramId] = useState({});
	const [requiredCourseLinks, setRequiredCourseLinks] = useState({});

	const currentSerialized = useMemo(() => serializeProfileForm(form), [form]);
	const hasChanges = currentSerialized !== initialSerialized;
	const courseOptions = useMemo(() => catalogByProgramId[form.programId] || [], [catalogByProgramId, form.programId]);
	const roleOptions = useMemo(() => roleOptionsByProgramId[form.programId] || [], [roleOptionsByProgramId, form.programId]);
	const requiredCourseLink = useMemo(() => requiredCourseLinks[form.programId] || null, [requiredCourseLinks, form.programId]);
	const selectedCourseKeys = useMemo(
		() => new Set((form.completedCourses || []).map((item) => `${item.major}::${item.courseCode}`)),
		[form.completedCourses]
	);

	const patchForm = (next) => {
		setForm(next);
	};

	async function onImportImage(event) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (!file.type.startsWith('image/')) {
			setImageError('Only image files are supported');
			return;
		}

		try {
			const dataUrl = await compressAvatarFile(file);
			const compressedBytes = estimateDataUrlBytes(dataUrl);

			setImageError(
				compressedBytes > AVATAR_MAX_BYTES
					? 'Ảnh đã được nén nhưng vẫn còn lớn. Bạn nên dùng ảnh nhỏ hơn để tải nhanh hơn.'
					: ''
			);
			setIdentity((prev) => ({ ...prev, avatarUrl: dataUrl }));
		} catch {
			setImageError('Failed to import image');
		}
	}

	function onDeleteImage() {
		setImageError('');
		setIdentity((prev) => ({ ...prev, avatarUrl: '' }));
	}

	async function onSaveProfile(event) {
		event.preventDefault();
		setSaving(true);

		const payload = {
			displayName: identity.displayName,
			fullName: identity.fullName,
			privacySetting: 'identified',
			avatarUrl: identity.avatarUrl,
		};

		const validation = validateProfilePayload(payload);
		if (!validation.ok) {
			addNotification(Object.values(validation.errors)[0], 'error');
			setSaving(false);
			return;
		}

		try {
			const result = await accountApi.updateProfile(accessToken, payload);
			const profile = result?.profile || {};
			setIdentity((prev) => ({
				...prev,
				email: profile.email || prev.email,
				displayName: profile.displayName || prev.displayName,
				fullName: profile.fullName || prev.fullName,
				avatarUrl: profile.avatarUrl || prev.avatarUrl,
			}));
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('account-profile-updated', {
						detail: {
							profile: {
								email: profile.email || identity.email,
								displayName: profile.displayName || identity.displayName,
								fullName: profile.fullName || identity.fullName,
								avatarUrl: profile.avatarUrl || identity.avatarUrl,
							},
						},
					})
				);
			}
			addNotification(result?.message || 'Profile updated', 'success');
		} catch (err) {
			if (err?.status === 401) {
				await logoutAndRedirect();
				return;
			}
			addNotification(err?.message || 'Failed to update profile', 'error');
		} finally {
			setSaving(false);
		}
	}

	const handleMajorChange = (programId) => {
		const nextRoleOptions = roleOptionsByProgramId[programId] || [];
		const currentRole = form?.careerGoal?.role || '';
		const keepRole = currentRole && nextRoleOptions.includes(currentRole);
		const major = String(catalogMajors.find((item) => item?.programId === programId)?.nameEN || '').trim();

		patchForm({
			...form,
			programId,
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
			addNotification('Save profile thành công.', 'success');
		} catch (err) {
			if (err?.status === 401) {
				await logoutAndRedirect();
				return;
			}

			addNotification(err?.message || 'Lưu profile thất bại.', 'error');
		} finally {
			setSaving(false);
		}
	};

	const handleRegenRoadmap = async () => {
		if (!accessToken) {
			return;
		}

		setRegenerating(true);
		try {
			await retryRoadmapGeneration(accessToken);
			setShowRegenRoadmap(false);
			addNotification('Đã gửi yêu cầu tạo lại Roadmap thành công.', 'success');
		} catch (err) {
			if (err?.status === 401) {
				await logoutAndRedirect();
				return;
			}

			addNotification(err?.message || 'Không thể tạo lại Roadmap.', 'error');
		} finally {
			setRegenerating(false);
		}
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

			try {
				const [profilePayload, catalogPayload] = await Promise.all([
					authApi.getProfile(accessToken),
					getCourseCatalog(accessToken),
				]);

				if (isMounted) {
					const identityPayload = profilePayload?.identity || {};
					setIdentity({
						userId: String(identityPayload.userId || profilePayload?.userId || '').trim(),
						email: String(identityPayload.email || '').trim(),
						displayName: String(identityPayload.displayName || identityPayload.fullName || 'Sinh viên UET').trim(),
						fullName: String(identityPayload.fullName || '').trim(),
						avatarUrl: String(identityPayload.avatarUrl || '').trim(),
					});

					const majorsList = Array.isArray(catalogPayload?.majors) ? catalogPayload.majors : [];
					const nextCatalogByProgramId =
						catalogPayload?.courseCatalog && typeof catalogPayload.courseCatalog === 'object'
							? catalogPayload.courseCatalog
							: {};
					const mapped = mapProfileToOnboardingForm(profilePayload, nextCatalogByProgramId, majorsList);

					setForm(mapped);
					setInitialSerialized(serializeProfileForm(mapped));
					setCatalogMajors(majorsList);
					setCatalogByProgramId(nextCatalogByProgramId);
					setRoleOptionsByProgramId(catalogPayload?.roleOptionsByProgramId && typeof catalogPayload.roleOptionsByProgramId === 'object' ? catalogPayload.roleOptionsByProgramId : {});
					setRequiredCourseLinks(catalogPayload?.requiredCourseLinks && typeof catalogPayload.requiredCourseLinks === 'object' ? catalogPayload.requiredCourseLinks : {});
				}
			} catch (err) {
				if (err?.status === 401) {
					await logoutAndRedirect();
					return;
				}

				if (isMounted) {
					const message = err?.message || 'Failed to load learning profile.';
					addNotification(message, 'error');
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
	}, [accessToken, logoutAndRedirect, addNotification]);

	return (
		<>
			<main className="learning-profile-page learning-profile-page--modern">
				{loading ? <div style={{ marginBottom: 12 }}>Loading learning profile...</div> : null}
				{!loading ? (
					<section className="learning-profile-content learning-profile-content--modern">
						<header className="learning-profile-header learning-profile-header--center">
							<h1>Hồ sơ sinh viên</h1>
							<h2>{identity.displayName}</h2>
							<p>{form.major || 'Chưa chọn ngành học'}</p>
						</header>

						<div className="learning-profile-layout">
							<div className="learning-profile-left">
								<section className="learning-profile-card learning-profile-card--profile">
									<div className="card-title-row">
										<User size={18} />
										<h3>Profile</h3>
									</div>
									<div className="learning-profile-card__layout">
										<div className="learning-profile-card__avatar">
											<div className="avatar-wrap">
												{identity.avatarUrl ? (
													<img src={identity.avatarUrl} alt="Avatar preview" className="avatar-image" />
												) : (
													<div className="avatar-fallback">{identity.displayName.charAt(0).toUpperCase() || 'U'}</div>
												)}
												<label htmlFor="avatarImport" className="avatar-edit-btn" title="Upload avatar">
													<Camera size={14} />
												</label>
											</div>
											<div className="avatar-actions">
												<input
													id="avatarImport"
													type="file"
													accept="image/*"
													onChange={onImportImage}
													hidden
												/>
												<label htmlFor="avatarImport" className="btn ghost">
													Import image
												</label>
												<button
													type="button"
													className="btn danger"
													onClick={onDeleteImage}
													disabled={loading || !identity.avatarUrl}
												>
													Delete image
												</button>
											</div>
											{imageError ? <p className="message error">{imageError}</p> : null}
										</div>

										<form className="learning-profile-card__details" onSubmit={onSaveProfile}>
											<div className="learning-profile-card__form">
												<div className="learning-field">
													<label htmlFor="profileDisplayName" className="learning-label">Tên hiển thị</label>
													<input
														id="profileDisplayName"
														className="learning-input"
														value={identity.displayName}
														onChange={(event) =>
															setIdentity((prev) => ({ ...prev, displayName: event.target.value }))
														}
													/>
												</div>
												<div className="learning-field">
													<label htmlFor="profileFullName" className="learning-label">Tên đầy đủ</label>
													<input
														id="profileFullName"
														className="learning-input"
														value={identity.fullName}
														onChange={(event) =>
															setIdentity((prev) => ({ ...prev, fullName: event.target.value }))
														}
													/>
												</div>
												<div className="learning-field">
													<label htmlFor="profileEmail" className="learning-label">Email</label>
													<input
														id="profileEmail"
														className="learning-input"
														value={identity.email}
														disabled
														readOnly
													/>
												</div>
											</div>
											<div className="card-actions card-actions--right">
												<button type="submit" className="btn primary" disabled={loading}>
													Save Profile
												</button>
											</div>
										</form>
									</div>
								</section>

								<section className="learning-profile-card learning-profile-card--learning">
									<div className="card-title-row">
										<BookOpenCheck size={18} />
										<h3>Learning</h3>
									</div>
									<div className="learning-section__card learning-grid-two">
										<div className="learning-field">
											<label htmlFor="major" className="learning-label">Ngành học</label>
											<select
												id="major"
												value={form.programId || ''}
												onChange={(event) => handleMajorChange(event.target.value)}
												className="learning-input learning-select"
											>
												<option value="">Chọn ngành học</option>
												{catalogMajors.map((major) => (
													<option key={major.programId} value={major.programId}>{major.nameEN}</option>
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
												disabled={!form.programId || roleOptions.length === 0}
												className="learning-input learning-select"
											>
												<option value="">
													{form.programId
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
										<div className="learning-field">
											<label htmlFor="timeline" className="learning-label">Dự kiến tốt nghiệp</label>
											<DatePicker
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
												className="learning-input"
												popperClassName="onboarding-datepicker-popper"
												calendarClassName="onboarding-datepicker-calendar"
											/>
										</div>
									</div>
								</section>
							</div>

							<div className="learning-profile-right">
								<section className="learning-profile-card learning-course-card">
									<div className="card-title-row">
										<GraduationCap size={18} />
										<h3>Các môn đã học</h3>
									</div>
									{catalogLoading ? <div className="onboarding-panel-note">Loading majors and courses...</div> : null}

									{!form.programId ? (
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
											<div className="learning-course-list learning-course-list--scroll">
												{courseOptions.map((course) => {
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
										</>
									)}
								</section>
							</div>
						</div>

						<footer className="learning-profile-footer">
							<div className="learning-profile-footer-left">
							</div>
							<div className="learning-profile-footer-center">
								{hasChanges ? (
									<button type="button" className="primary-btn" onClick={handleSaveProfile} disabled={saving}>
										<Save size={17} />
										{saving ? 'Đang lưu...' : 'Lưu thông tin'}
									</button>
								) : null}
								<button type="button" className="secondary-btn" onClick={() => navigateTo(identity?.userId ? `/public-profile/${identity.userId}` : '/public-profile')}>
									Xem trang cá nhân công khai
								</button>
								{showRegenRoadmap ? (
									<button type="button" className="secondary-btn" onClick={handleRegenRoadmap} disabled={regenerating}>
										<Sparkles size={17} />
										{regenerating ? 'Đang tạo lại Roadmap...' : 'Tạo lại Roadmap'}
									</button>
								) : null}
							</div>
						</footer>
					</section>
				) : null}
			</main>
		<SiteFooter />
		</>
	);
}