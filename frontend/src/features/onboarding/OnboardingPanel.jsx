import { useMemo, useState } from 'react';
import MajorSelect from './MajorSelect';
import CourseMultiSelect from './CourseMultiSelect';
import CareerGoalForm from './CareerGoalForm';
import { useOnboardingDraft } from './useOnboardingDraft';
import { useRoadmapStatus } from './useRoadmapStatus';
import { postSubmit } from '../../services/onboarding.api';

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
	],
	'Information Systems': [{ courseCode: 'INT3105', name: 'Database Systems' }],
	'Computer Engineering': [{ courseCode: 'INT3401', name: 'Digital Design' }],
};

export default function OnboardingPanel({ authToken, sseToken, onUnauthorized, onCompleted }) {
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
			setIsOpen(false);
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
		return (
			<div style={{ marginBottom: 16 }}>
				<button type="button" onClick={() => setIsOpen(true)}>Reopen onboarding</button>
				{showLowPersonalization && (
					<div style={{ marginTop: 8, padding: 8, border: '1px solid #f0ad4e', background: '#fff8e1' }}>
						Your roadmap is in generic mode. Improve personalization by adding optional fields like target role.
						<a href="/settings" style={{ marginLeft: 8 }}>
							Go to Settings
						</a>
					</div>
				)}
			</div>
		);
	}

	return (
		<section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
			<h2 style={{ marginTop: 0 }}>Student onboarding</h2>
			<p style={{ marginTop: 0, color: '#666' }}>Only major is required. Optional fields improve recommendation quality.</p>

			{loading ? <div>Loading draft...</div> : null}

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

			{submitError ? <div style={{ color: '#b00020', marginBottom: 8 }}>{submitError}</div> : null}
			{roadmapStatus.status === 'failed' ? (
				<div style={{ marginBottom: 8 }}>
					Roadmap generation failed.
					<button type="button" style={{ marginLeft: 8 }} onClick={roadmapStatus.retry}>
						Retry
					</button>
				</div>
			) : null}

			<div style={{ display: 'flex', gap: 8 }}>
				<button type="button" onClick={handleSubmit} disabled={!canSubmit || submitState === 'submitting'}>
					{submitState === 'submitting' ? 'Submitting...' : 'Submit'}
				</button>
				<button type="button" onClick={() => setIsOpen(false)} disabled={submitState === 'submitting'}>
					Dismiss
				</button>
			</div>

			{saving ? <small style={{ color: '#666' }}>Saving draft...</small> : null}
		</section>
	);
}
