import { useEffect, useMemo, useState } from 'react';
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
	personalAspirations: '',
};

export default function OnboardingPanel({ authToken, sseToken, onUnauthorized, onCompleted, onClose }) {
	const [isOpen, setIsOpen] = useState(true);
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitState, setSubmitState] = useState('idle');
	const [submitError, setSubmitError] = useState(null);
	const [showLowPersonalization, setShowLowPersonalization] = useState(false);
	const [catalogLoading, setCatalogLoading] = useState(true);
	const [catalogError, setCatalogError] = useState(null);
	const [catalogMajors, setCatalogMajors] = useState([]);
	const [catalogByMajor, setCatalogByMajor] = useState({});

	const { draft, loading, saving, scheduleSave } = useOnboardingDraft({
		authToken,
		onUnauthorized,
	});

	const roadmapStatus = useRoadmapStatus({
		authToken,
		sseToken,
		onUnauthorized,
	});

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
			} catch (error) {
				if (disposed) {
					return;
				}

				if (authToken && error?.status === 401 && onUnauthorized) {
					onUnauthorized();
				}
				setCatalogError(error.message || 'Failed to load course catalog');
				setCatalogMajors([]);
				setCatalogByMajor({});
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
	}, [authToken, onUnauthorized]);

	const mergedForm = draft ? { ...EMPTY_FORM, ...draft } : form;
	const courseOptions = useMemo(() => catalogByMajor[mergedForm.major] || [], [catalogByMajor, mergedForm.major]);

	const patchForm = (nextForm) => {
		setForm(nextForm);
		scheduleSave(nextForm);
	};

	const canSubmit = !!mergedForm.major;

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
			const response = await postSubmit(authToken, mergedForm);
			setShowLowPersonalization(Boolean(response?.isGeneric));
			setSubmitState('submitted');
			closePanel();
			roadmapStatus.open();
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
		<section className="onboarding-panel-shell">
			<h2 className="onboarding-panel-title">Student onboarding</h2>
			<p className="onboarding-panel-description">Only major is required. Optional fields improve recommendation quality.</p>

			{loading ? <div className="onboarding-panel-note">Loading draft...</div> : null}
			{catalogLoading ? <div>Loading majors and courses...</div> : null}
			{catalogError ? <div style={{ color: '#b00020', marginBottom: 8 }}>{catalogError}</div> : null}

			<MajorSelect
				value={mergedForm.major}
				selectedCourses={mergedForm.completedCourses}
				onResetCourses={() => patchForm({ ...mergedForm, completedCourses: [] })}
				onChange={(major) => patchForm({ ...mergedForm, major })}
				majors={catalogMajors}
			/>

			<CourseMultiSelect
				major={mergedForm.major}
				options={courseOptions}
				value={mergedForm.completedCourses || []}
				onChange={(completedCourses) => patchForm({ ...mergedForm, completedCourses })}
			/>

			<CareerGoalForm value={mergedForm} onChange={patchForm} />

			{submitError ? <div className="onboarding-panel-error">{submitError}</div> : null}
			{showLowPersonalization ? (
				<div className="onboarding-panel-warning">
					Your roadmap is in generic mode. Improve personalization by adding optional fields like target role.
					<a href="/settings">Go to Settings</a>
				</div>
			) : null}
			{roadmapStatus.status === 'failed' ? (
				<div className="onboarding-panel-note">
					Roadmap generation failed.
					<button type="button" className="secondary-btn onboarding-panel-inline-btn" onClick={roadmapStatus.retry}>
						Retry
					</button>
				</div>
			) : null}

			<div className="onboarding-panel-actions">
				<button type="button" className="primary-btn" onClick={handleSubmit} disabled={!canSubmit || submitState === 'submitting'}>
					{submitState === 'submitting' ? 'Submitting...' : 'Submit'}
				</button>
				<button type="button" className="secondary-btn" onClick={closePanel} disabled={submitState === 'submitting'}>
					Dismiss
				</button>
			</div>

			{saving ? <small className="onboarding-panel-note">Saving draft...</small> : null}
		</section>
	);
}
