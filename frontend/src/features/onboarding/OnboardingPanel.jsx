import { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Map, GitBranch, LibraryBig, Users, Search } from 'lucide-react';
import { useOnboardingDraft } from './useOnboardingDraft';
import { useRoadmapStatus } from './useRoadmapStatus';
import { getCourseCatalog, postSubmit } from '../../services/onboarding.api';
import { useNotification } from '../notification/NotificationContainer';
import DatePicker from '../../shared/DatePicker';
import './onboarding-panel.css';

const EMPTY_FORM = {
	programId: '',
	major: '',
	completedCourses: [],
	careerGoal: {
		role: '',
		companyType: '',
		graduationTimeline: '',
	},
};

function resolveDisplayNameFromToken(token) {
	if (!token || typeof window === 'undefined') {
		return '';
	}

	try {
		const payloadPart = token.split('.')[1] || '';
		const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
		const decoded = window.atob(normalized);
		const payload = JSON.parse(decoded);
		return String(payload?.displayName || payload?.fullName || payload?.name || '').trim();
	} catch (_) {
		return '';
	}
}

function normalizeDateValue(value) {
	const raw = String(value || '').trim();
	if (!raw) {
		return '';
	}

	if (/^\d{4}-\d{2}$/.test(raw)) {
		return `${raw}-01`;
	}

	return raw;
}

export default function OnboardingPanel({
	authToken,
	sseToken,
	onUnauthorized,
	onCompleted,
	onClose,
	mode = 'edit',
	initialForm = null,
	title = 'Chào mừng bạn đến với UETCompass',
	description = 'Vui lòng hoàn tất hồ sơ cá nhân để bắt đầu.',
	isFullPage = false,
	enableDraftAutosave = true,
	onSubmitForm = null,
	submitLabel = 'Submit',
	submittingLabel = 'Submitting...',
	successLabel = 'Saved successfully.',
	showDismissButton = true,
	closeOnSubmit = true,
}) {
	const isViewMode = mode === 'view';
	const draftEnabled = !isViewMode && enableDraftAutosave;
	const onUnauthorizedRef = useRef(onUnauthorized);
	const [isOpen, setIsOpen] = useState(true);
	const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(initialForm || {}) }));
	const [draftHydrated, setDraftHydrated] = useState(false);
	const [submitState, setSubmitState] = useState('idle');
	const [submitError, setSubmitError] = useState(null);
	const [showLowPersonalization, setShowLowPersonalization] = useState(false);
	const [catalogLoading, setCatalogLoading] = useState(true);
	const [catalogError, setCatalogError] = useState(null);
	const [catalogMajors, setCatalogMajors] = useState([]);
	const [catalogByMajor, setCatalogByMajor] = useState({});
	const [roleOptionsByProgramId, setRoleOptionsByProgramId] = useState({});
	const [requiredCourseLinks, setRequiredCourseLinks] = useState({});
	const [courseSearch, setCourseSearch] = useState('');
	const [showAllCourses, setShowAllCourses] = useState(false);
	const notificationApi = useNotification();
	const addNotification = notificationApi?.addNotification || (() => {});

	const { draft, loading, saving, scheduleSave } = useOnboardingDraft({
		authToken,
		onUnauthorized,
		enabled: draftEnabled,
	});

	const roadmapStatus = useRoadmapStatus({
		authToken,
		sseToken,
		onUnauthorized,
	});

	useEffect(() => {
		onUnauthorizedRef.current = onUnauthorized;
	}, [onUnauthorized]);

	useEffect(() => {
		if (!isViewMode && !draftEnabled && initialForm) {
			setForm({ ...EMPTY_FORM, ...initialForm });
			setDraftHydrated(true);
			return;
		}

		if (isViewMode) {
			setForm({ ...EMPTY_FORM, ...(initialForm || {}) });
			setDraftHydrated(true);
			return;
		}

		if (draftHydrated) {
			return;
		}

		if (draft) {
			setForm({ ...EMPTY_FORM, ...draft });
			setDraftHydrated(true);
			return;
		}

		if (!loading) {
			setDraftHydrated(true);
		}
	}, [draft, draftEnabled, initialForm, isViewMode, loading, draftHydrated]);

	useEffect(() => {
		let disposed = false;

		async function loadCatalog() {
			setCatalogLoading(true);
			setCatalogError(null);

			try {
				const payload = await getCourseCatalog(authToken);
				if (disposed) {
					return;
				}

				setCatalogMajors(Array.isArray(payload?.majors) ? payload.majors : []);
				setCatalogByMajor(payload?.courseCatalog && typeof payload.courseCatalog === 'object' ? payload.courseCatalog : {});
				setRoleOptionsByProgramId(payload?.roleOptionsByProgramId && typeof payload.roleOptionsByProgramId === 'object' ? payload.roleOptionsByProgramId : {});
				setRequiredCourseLinks(payload?.requiredCourseLinks && typeof payload.requiredCourseLinks === 'object' ? payload.requiredCourseLinks : {});
			} catch (error) {
				if (disposed) {
					return;
				}

				if (authToken && error?.status === 401 && typeof onUnauthorizedRef.current === 'function') {
					onUnauthorizedRef.current();
				}
				setCatalogError(error.message || 'Failed to load course catalog');
				setCatalogMajors([]);
				setCatalogByMajor({});
				setRoleOptionsByProgramId({});
				setRequiredCourseLinks({});
			} finally {
				if (!disposed) {
					setCatalogLoading(false);
				}
			}
		}

		loadCatalog();

		return () => {
			disposed = true;
		};
	}, [authToken]);

	const mergedForm = form;
	const courseOptions = useMemo(() => catalogByMajor[mergedForm.programId] || [], [catalogByMajor, mergedForm.programId]);
	const roleOptions = useMemo(() => roleOptionsByProgramId[mergedForm.programId] || [], [roleOptionsByProgramId, mergedForm.programId]);
	const requiredCourseLink = useMemo(() => requiredCourseLinks[mergedForm.programId] || null, [requiredCourseLinks, mergedForm.programId]);
	const selectedCourseKeys = useMemo(
		() => new Set((mergedForm.completedCourses || []).map((item) => `${mergedForm.major}::${item.courseCode}`)),
		[mergedForm.completedCourses, mergedForm.major]
	);
	const filteredCourses = useMemo(() => {
		const keyword = courseSearch.trim().toLowerCase();
		if (!keyword) {
			return courseOptions;
		}

		return courseOptions.filter((course) => {
			const code = String(course?.courseCode || '').toLowerCase();
			const name = String(course?.name || '').toLowerCase();
			return code.includes(keyword) || name.includes(keyword);
		});
	}, [courseOptions, courseSearch]);
	const visibleCourses = useMemo(
		() => (showAllCourses ? filteredCourses : filteredCourses.slice(0, 7)),
		[filteredCourses, showAllCourses]
	);
	const displayName = useMemo(() => resolveDisplayNameFromToken(authToken) || 'bạn', [authToken]);

	const patchForm = (nextForm) => {
		if (isViewMode) {
			return;
		}

		setForm(nextForm);
		if (draftEnabled) {
			scheduleSave(nextForm);
		}
	};

	useEffect(() => {
		if (!mergedForm.programId && mergedForm.major && catalogMajors.length > 0) {
			const matched = catalogMajors.find((item) => item?.nameEN === mergedForm.major);
			if (matched?.programId) {
				setForm((prev) => ({ ...prev, programId: matched.programId }));
			}
		}
	}, [catalogMajors, mergedForm.programId, mergedForm.major]);

	
	const selectedMajorName = useMemo(() => {
		const matched = catalogMajors.find((item) => item?.programId === mergedForm.programId);
		return matched?.nameEN || mergedForm.major || '';
	}, [catalogMajors, mergedForm.major, mergedForm.programId]);

	const handleMajorChange = (programId) => {
		const nextRoleOptions = roleOptionsByProgramId[programId] || [];
		const currentRole = mergedForm?.careerGoal?.role || '';
		const keepRole = currentRole && nextRoleOptions.includes(currentRole);
		const major = catalogMajors.find((item) => item?.programId === programId)?.nameEN || '';

		patchForm({
			...mergedForm,
			programId,
			major,
			completedCourses: major === mergedForm.major ? mergedForm.completedCourses : [],
			careerGoal: {
				...(mergedForm.careerGoal || {}),
				role: keepRole ? currentRole : '',
			},
		});
	};

	const handleToggleCourse = (course) => {
		const key = `${mergedForm.major}::${course.courseCode}`;
		const selected = new Set(selectedCourseKeys);

		if (selected.has(key)) {
			selected.delete(key);
		} else {
			selected.add(key);
		}

		const next = courseOptions
			.filter((item) => selected.has(`${mergedForm.major}::${item.courseCode}`))
			.map((item) => ({
				major: mergedForm.major,
				courseCode: item.courseCode,
				courseUnitId: item.courseUnitId,
			}));

		patchForm({
			...mergedForm,
			completedCourses: next,
		});
	};

	const canSubmit = !isViewMode && !!mergedForm.programId;

	const closePanel = () => {
		setIsOpen(false);
		if (typeof onClose === 'function') {
			onClose();
		}
	};

	const handleSubmit = async () => {
		if (!canSubmit) {
			return;
		}

		setSubmitState('submitting');
		setSubmitError(null);

		try {
			const response = onSubmitForm
				? await onSubmitForm(mergedForm)
				: await postSubmit(authToken, mergedForm);

			if (!onSubmitForm) {
				setShowLowPersonalization(Boolean(response?.isGeneric));
			}

			setSubmitState('submitted');
			addNotification(successLabel, 'success');

			if (closeOnSubmit) {
				closePanel();
			}

			if (!onSubmitForm) {
				roadmapStatus.open();
			}

			if (typeof onCompleted === 'function') {
				onCompleted(response);
			}
		} catch (error) {
			setSubmitState('failed');
			setSubmitError(error.message);
			addNotification(error?.message || 'Submit failed.', 'error');
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<section className={`onboarding-panel-shell${isFullPage ? ' onboarding-panel-shell--page' : ''}`}>
			<div className="onboarding-panel-layout">
				<aside className="onboarding-panel-aside">
					<div className="onboarding-panel-brand-row">
						<span className="onboarding-panel-brand-icon"><Compass size={15} /></span>
						<span className="onboarding-panel-brand-name">UETCompass</span>
					</div>

					<h2 className="onboarding-panel-aside-title">
						Xây dựng <u>la bàn</u> dẫn lối sự nghiệp cho riêng bạn.
					</h2>
					<p className="onboarding-panel-aside-description">
						Những thông tin này giúp chúng tôi cá nhân hóa kỹ năng và gợi ý học phần phù hợp với mục tiêu của bạn tại UET-VNU.
					</p>

					<ul className="onboarding-panel-benefits" aria-label="Benefits">
						<li>
							<span><Map size={16} /></span>
							<div>
								<strong>Lộ trình theo thời lượng đào tạo</strong>
								<p>Phân bổ môn học hợp lý theo từng học kỳ.</p>
							</div>
						</li>
						<li>
							<span><GitBranch size={16} /></span>
							<div>
								<strong>Cây kỹ năng trực quan</strong>
								<p>Theo dõi sự phát triển kỹ năng mà thị trường cần.</p>
							</div>
						</li>
						<li>
							<span><LibraryBig size={16} /></span>
							<div>
								<strong>Tài liệu tham khảo chọn lọc</strong>
								<p>Nguồn học liệu chất lượng do giảng viên và cựu sinh viên đề xuất.</p>
							</div>
						</li>
						<li>
							<span><Users size={16} /></span>
							<div>
								<strong>Cộng đồng hỗ trợ</strong>
								<p>Kết nối với cố vấn học tập và bạn đồng hành cùng chuyên ngành.</p>
							</div>
						</li>
					</ul>
				</aside>

				<div className="onboarding-panel-form-wrap">
					<header className="onboarding-panel-form-head">
						<h3>{title}</h3>
						<p>
							Chào mừng, {displayName}!
							<span> {description}</span>
						</p>
					</header>

					{loading ? <div className="onboarding-panel-note">Loading draft...</div> : null}
					{catalogLoading ? <div className="onboarding-panel-note">Loading majors and courses...</div> : null}
					{catalogError ? <div className="onboarding-panel-error">{catalogError}</div> : null}

					<div className="onboarding-modern-form-grid">
						<div className="onboarding-modern-field">
							<label htmlFor="onboarding-major">Ngành học hiện tại</label>
							<select
								id="onboarding-major"
								value={mergedForm.programId || ''}
								onChange={(event) => handleMajorChange(event.target.value)}
								disabled={isViewMode}
							>
								<option value="">Chọn ngành học</option>
								{catalogMajors.map((major) => (
									<option key={major.programId} value={major.programId}>{major.nameEN}</option>
								))}
							</select>
						</div>

						<div className="onboarding-modern-field">
							<label htmlFor="onboarding-role">Mục tiêu nghề nghiệp</label>
							<select
								id="onboarding-role"
								value={mergedForm?.careerGoal?.role || ''}
								onChange={(event) =>
									patchForm({
										...mergedForm,
										careerGoal: {
											...(mergedForm.careerGoal || {}),
											role: event.target.value,
										},
									})
								}
								disabled={isViewMode || !mergedForm.programId || roleOptions.length === 0}
							>
								<option value="">{mergedForm.programId ? 'Chọn vai trò mục tiêu' : 'Chọn ngành học trước'}</option>
								{roleOptions.map((role) => (
									<option key={role} value={role}>{role}</option>
								))}
							</select>
						</div>

						<div className="onboarding-modern-field onboarding-modern-field--full">
							<div className="onboarding-modern-field-head">
								<label htmlFor="onboarding-course-search">Môn tự chọn đã học</label>
								{courseOptions.length > 7 ? (
									<button type="button" onClick={() => setShowAllCourses((prev) => !prev)}>
										{showAllCourses ? 'Thu gọn' : 'Xem toàn bộ môn học'}
									</button>
								) : null}
							</div>

							<div className="onboarding-modern-course-box">
								<div className="onboarding-modern-course-search">
									<Search size={15} />
									<input
										id="onboarding-course-search"
										type="text"
										placeholder="Tìm kiếm mã môn hoặc tên..."
										value={courseSearch}
										onChange={(event) => setCourseSearch(event.target.value)}
										disabled={isViewMode || !mergedForm.programId}
									/>
								</div>

								<div className="onboarding-modern-course-list">
									{!mergedForm.programId ? (
										<div className="onboarding-panel-note">Chọn ngành học để hiển thị danh sách môn học.</div>
									) : visibleCourses.length === 0 ? (
										<div className="onboarding-panel-note">Không tìm thấy môn học phù hợp.</div>
									) : (
										visibleCourses.map((course) => {
											const key = `${mergedForm.major}::${course.courseCode}`;
											const checked = selectedCourseKeys.has(key);
											return (
												<label key={key} className="onboarding-modern-course-item">
													<input
														type="checkbox"
														checked={checked}
														onChange={() => handleToggleCourse(course)}
														disabled={isViewMode}
													/>
													<span>{course.courseCode} - {course.name}</span>
												</label>
											);
										})
									)}
								</div>
							</div>
							{requiredCourseLink ? (
								<a className="onboarding-modern-link" href={requiredCourseLink} target="_blank" rel="noreferrer">
									Môn bắt buộc theo ngành
								</a>
							) : null}
						</div>

						<div className="onboarding-modern-field">
							<label htmlFor="onboarding-grad-month">Dự kiến tốt nghiệp</label>
							<DatePicker
								id="onboarding-grad-month"
								value={normalizeDateValue(mergedForm?.careerGoal?.graduationTimeline)}
								onChange={(event) =>
									patchForm({
										...mergedForm,
										careerGoal: {
											...(mergedForm.careerGoal || {}),
											graduationTimeline: event.target.value,
										},
									})
								}
								disabled={isViewMode}
								dateFormat="dd/MM/yyyy"
								placeholder="dd/mm/yyyy"
								className="onboarding-input"
								popperClassName="onboarding-datepicker-popper"
								calendarClassName="onboarding-datepicker-calendar"
							/>
						</div>
					</div>

					{!isViewMode && submitError ? <div className="onboarding-panel-error">{submitError}</div> : null}
					{!isViewMode && showLowPersonalization ? (
						<div className="onboarding-panel-warning">
							Roadmap is in generic mode. Add target role to improve personalization.
							<a href="/settings">Go to settings</a>
						</div>
					) : null}
					{!isViewMode && roadmapStatus.status === 'failed' ? (
						<div className="onboarding-panel-note">
							Roadmap generation failed.
							<button type="button" className="secondary-btn onboarding-panel-inline-btn" onClick={roadmapStatus.retry}>
								Retry
							</button>
						</div>
					) : null}

					{!isViewMode && (
						<div className="onboarding-panel-actions-wrap">
							<div className="onboarding-panel-actions">
								<button type="button" className="primary-btn" onClick={handleSubmit} disabled={!canSubmit || submitState === 'submitting'}>
									{submitState === 'submitting' ? submittingLabel : submitLabel}
								</button>
								{showDismissButton ? (
									<button type="button" className="secondary-btn" onClick={closePanel} disabled={submitState === 'submitting'}>
										Hoàn thiện sau
									</button>
								) : null}
							</div>
							<small className="onboarding-panel-note onboarding-save-status">
								{saving ? 'Saving draft...' : ' '}
							</small>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
