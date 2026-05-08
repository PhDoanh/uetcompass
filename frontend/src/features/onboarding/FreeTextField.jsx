import { useMemo } from 'react';

const MIN_FREE_TEXT_LENGTH = 3;
const HAS_UNICODE_LETTER = /\p{L}/u;

function validate(value) {
	const trimmed = String(value || '').trim();
	if (!trimmed) {
		return null;
	}
	if (trimmed.length < MIN_FREE_TEXT_LENGTH) {
		return `Must be at least ${MIN_FREE_TEXT_LENGTH} characters`;
	}
	if (!HAS_UNICODE_LETTER.test(trimmed)) {
		return 'Must contain at least one letter';
	}
	return null;
}

export default function FreeTextField({
	id,
	label,
	value,
	onChange,
	maxLength = 500,
	placeholder,
}) {
	const error = useMemo(() => validate(value), [value]);
	const length = (value || '').length;

	return (
		<div className="onboarding-field">
			<label htmlFor={id} className="onboarding-label">
				{label} <span className="onboarding-label-optional">(optional)</span>
			</label>
			<input
				id={id}
				value={value || ''}
				maxLength={maxLength}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="onboarding-input"
			/>
			<div className="onboarding-meta-row">
				<span className="onboarding-error-text">{error || ''}</span>
				<span className="onboarding-counter-text">
					{length}/{maxLength}
				</span>
			</div>
		</div>
	);
}
