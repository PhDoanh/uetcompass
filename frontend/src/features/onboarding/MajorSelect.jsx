import { useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_MAJORS = [
	{ programId: 'CS', nameEN: 'Computer Science' },
	{ programId: 'IS', nameEN: 'Information Systems' },
	{ programId: 'CE', nameEN: 'Computer Engineering' },
];

export default function MajorSelect({
	value,
	onChange,
	selectedCourses = [],
	onResetCourses,
	majors = DEFAULT_MAJORS,
}) {
	const [showConfirm, setShowConfirm] = useState(false);
	const [pendingMajor, setPendingMajor] = useState('');

	const handleMajorChange = (nextMajor) => {
		if (value && value !== nextMajor && selectedCourses.length > 0) {
			setPendingMajor(nextMajor);
			setShowConfirm(true);
			return;
		}
		onChange(nextMajor);
	};

	const handleCancelChange = () => {
		setPendingMajor('');
		setShowConfirm(false);
	};

	const handleConfirmChange = () => {
		onResetCourses?.();
		onChange(pendingMajor);
		setPendingMajor('');
		setShowConfirm(false);
	};

	const confirmModal = showConfirm && typeof document !== 'undefined'
		? createPortal(
			<div className="onboarding-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-confirm-title">
				<div className="onboarding-confirm-popup">
					<h3 id="onboarding-confirm-title" className="onboarding-confirm-popup__title">Confirm major change</h3>
					<p className="onboarding-confirm-popup__message">
						Changing major will clear selected completed courses. Continue?
					</p>
					<div className="onboarding-confirm-popup__actions">
						<button type="button" className="secondary-btn" onClick={handleCancelChange}>Cancel</button>
						<button type="button" className="primary-btn" onClick={handleConfirmChange}>Continue</button>
					</div>
				</div>
			</div>,
			document.body
		)
		: null;

	return (
		<div className="onboarding-field">
			<label htmlFor="major" className="onboarding-label">
				Major <span className="onboarding-label-required">*</span>
			</label>
			<select
				id="major"
				value={value || ''}
				onChange={(event) => handleMajorChange(event.target.value)}
				className="onboarding-input onboarding-select"
			>
				<option value="">Select major</option>
				{majors.map((major) => (
					<option key={major.programId} value={major.programId}>
						{major.nameEN}
					</option>
				))}
			</select>

			{confirmModal}
		</div>
	);
}
