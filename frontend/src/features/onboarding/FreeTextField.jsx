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
		<div style={{ marginBottom: 12 }}>
			<label htmlFor={id} style={{ display: 'block', fontWeight: 600 }}>
				{label} <span style={{ fontWeight: 400 }}>(optional)</span>
			</label>
			<input
				id={id}
				value={value || ''}
				maxLength={maxLength}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				style={{ width: '100%', padding: 8, marginTop: 4 }}
			/>
			<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
				<span style={{ color: '#b00020' }}>{error || ''}</span>
				<span style={{ color: '#666' }}>
					{length}/{maxLength}
				</span>
			</div>
		</div>
	);
}
