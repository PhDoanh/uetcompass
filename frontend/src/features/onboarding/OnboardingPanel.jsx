import { useEffect, useMemo, useRef, useState } from 'react';
import MajorSelect from './MajorSelect';
import CourseMultiSelect from './CourseMultiSelect';
import CareerGoalForm from './CareerGoalForm';
import { useOnboardingDraft } from './useOnboardingDraft';
import { useRoadmapStatus } from './useRoadmapStatus';
import { getCourseCatalog, postSubmit } from '../../services/onboarding.api';
import './onboarding-panel.css';

const EMPTY_FORM = {
	major: '',
	completedCourses: [],
	careerGoal: {
		role: '',
		companyType: '',
		graduationTimeline: '',
	},
};

export default function OnboardingPanel({
	authToken,
	sseToken,
	onUnauthorized,
	onCompleted,
	onClose,
	mode = 'edit',
	initialForm = null,
	title = 'Student onboarding',
	description = 'Welcome! Please complete the following fields to continue.',
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
	const [submitSuccess, setSubmitSuccess] = useState('');
	const [showLowPersonalization, setShowLowPersonalization] = useState(false);
	const [catalogLoading, setCatalogLoading] = useState(true);
	const [catalogError, setCatalogError] = useState(null);
	const [catalogMajors, setCatalogMajors] = useState([]);
	const [catalogByMajor, setCatalogByMajor] = useState({});
	const [roleOptionsByMajor, setRoleOptionsByMajor] = useState({});
	const [requiredCourseLinks, setRequiredCourseLinks] = useState({});

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
				setRoleOptionsByMajor(payload?.roleOptionsByMajor && typeof payload.roleOptionsByMajor === 'object' ? payload.roleOptionsByMajor : {});
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
				setRoleOptionsByMajor({});
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
	const courseOptions = useMemo(() => catalogByMajor[mergedForm.major] || [], [catalogByMajor, mergedForm.major]);
	const roleOptions = useMemo(() => roleOptionsByMajor[mergedForm.major] || [], [roleOptionsByMajor, mergedForm.major]);
	const requiredCourseLink = useMemo(() => requiredCourseLinks[mergedForm.major] || null, [requiredCourseLinks, mergedForm.major]);

	const patchForm = (nextForm) => {
		if (isViewMode) {
			return;
		}

		setSubmitSuccess('');
		setForm(nextForm);
		if (draftEnabled) {
			scheduleSave(nextForm);
		}
	};

	const handleMajorChange = (major) => {
		const nextRoleOptions = roleOptionsByMajor[major] || [];
		const currentRole = mergedForm?.careerGoal?.role || '';
		const keepRole = currentRole && nextRoleOptions.includes(currentRole);

		patchForm({
			...mergedForm,
			major,
			careerGoal: {
				...(mergedForm.careerGoal || {}),
				role: keepRole ? currentRole : '',
			},
		});
	};

	const canSubmit = !isViewMode && !!mergedForm.major;

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
		setSubmitSuccess('');

		try {
			const response = onSubmitForm
				? await onSubmitForm(mergedForm)
				: await postSubmit(authToken, mergedForm);

			if (!onSubmitForm) {
				setShowLowPersonalization(Boolean(response?.isGeneric));
			}

			setSubmitState('submitted');
			setSubmitSuccess(successLabel);

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
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<section className={`onboarding-panel-shell${isFullPage ? ' onboarding-panel-shell--page' : ''}`}>
			<h2 className="onboarding-panel-title">{title}</h2>
			<p className="onboarding-panel-description">{description}</p>

			{loading ? <div className="onboarding-panel-note">Loading draft...</div> : null}
			{catalogLoading ? <div>Loading majors and courses...</div> : null}
			{catalogError ? <div style={{ color: '#b00020', marginBottom: 8 }}>{catalogError}</div> : null}

			<MajorSelect
				value={mergedForm.major}
				selectedCourses={mergedForm.completedCourses}
				onResetCourses={() => patchForm({ ...mergedForm, completedCourses: [] })}
				onChange={handleMajorChange}
				majors={catalogMajors}
				disabled={isViewMode}
			/>

			<CourseMultiSelect
				major={mergedForm.major}
				requiredCourseLink={requiredCourseLink}
				options={courseOptions}
				value={mergedForm.completedCourses || []}
				onChange={(completedCourses) => patchForm({ ...mergedForm, completedCourses })}
				disabled={isViewMode}
			/>

			<CareerGoalForm value={mergedForm} roleOptions={roleOptions} onChange={patchForm} disabled={isViewMode} />

			{!isViewMode && submitError ? <div className="onboarding-panel-error">{submitError}</div> : null}
			{!isViewMode && submitSuccess ? <div className="onboarding-panel-note" style={{ color: '#7dd3fc' }}>{submitSuccess}</div> : null}
			{!isViewMode && showLowPersonalization ? (
				<div className="onboarding-panel-warning">
					Your roadmap is in generic mode. Improve personalization by adding optional fields like target role.
					<a href="/settings">Go to Settings</a>
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

			{!isViewMode ? (
				<div className="onboarding-panel-actions">
					<button type="button" className="primary-btn" onClick={handleSubmit} disabled={!canSubmit || submitState === 'submitting'}>
						{submitState === 'submitting' ? submittingLabel : submitLabel}
					</button>
					{showDismissButton ? (
						<button type="button" className="secondary-btn" onClick={closePanel} disabled={submitState === 'submitting'}>
							Dismiss
						</button>
					) : null}
				</div>
			) : null}

			{!isViewMode ? <small className="onboarding-panel-note onboarding-save-status">{saving ? 'Saving draft...' : ' '}</small> : null}
		</section>
	);
}
