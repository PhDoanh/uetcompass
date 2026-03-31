import { useMemo, useState } from 'react';
import MajorSelect from './MajorSelect';
import CourseMultiSelect from './CourseMultiSelect';
import CareerGoalForm from './CareerGoalForm';
import { useOnboardingDraft } from './useOnboardingDraft';
import { useRoadmapStatus } from './useRoadmapStatus';
import { postSubmit } from '../../services/onboarding.api';
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

const COURSE_CATALOG = {
	'Computer Science': [
		{ courseCode: 'INT2204', name: 'Object Oriented Programming' },
		{ courseCode: 'INT2210', name: 'Data Structures and Algorithms' },
		{ courseCode: 'INT2203', name: 'Discrete Mathematics' },
		{ courseCode: 'INT3117', name: 'Operating Systems' },
		{ courseCode: 'INT3405', name: 'Artificial Intelligence Fundamentals' },
	],
	'Information Systems': [
		{ courseCode: 'INT3105', name: 'Database Systems' },
		{ courseCode: 'INT3110', name: 'Systems Analysis and Design' },
		{ courseCode: 'INT3122', name: 'Enterprise Information Systems' },
		{ courseCode: 'INT3150', name: 'Business Intelligence' },
		{ courseCode: 'INT3161', name: 'Project Management for IT' },
	],
	'Computer Engineering': [
		{ courseCode: 'INT3401', name: 'Digital Design' },
		{ courseCode: 'INT3403', name: 'Computer Architecture' },
		{ courseCode: 'INT3407', name: 'Embedded Systems' },
		{ courseCode: 'INT3411', name: 'Microprocessors and Interfacing' },
		{ courseCode: 'INT3415', name: 'VLSI Design Basics' },
	],
};

export default function OnboardingPanel({ authToken, sseToken, onUnauthorized, onCompleted, onClose }) {
	const [isOpen, setIsOpen] = useState(true);
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitState, setSubmitState] = useState('idle');
	const [submitError, setSubmitError] = useState(null);
	const [showLowPersonalization, setShowLowPersonalization] = useState(false);

	const { draft, loading, saving, scheduleSave } = useOnboardingDraft({
		authToken,
		onUnauthorized,
	});

	const roadmapStatus = useRoadmapStatus({
		authToken,
		sseToken,
		onUnauthorized,
	});

	const mergedForm = draft ? { ...EMPTY_FORM, ...draft } : form;
	const courseOptions = useMemo(() => COURSE_CATALOG[mergedForm.major] || [], [mergedForm.major]);

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

			<MajorSelect
				value={mergedForm.major}
				selectedCourses={mergedForm.completedCourses}
				onResetCourses={() => patchForm({ ...mergedForm, completedCourses: [] })}
				onChange={(major) => patchForm({ ...mergedForm, major })}
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
