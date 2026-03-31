const DEFAULT_MAJORS = ['Computer Science', 'Information Systems', 'Computer Engineering'];

export default function MajorSelect({
	value,
	onChange,
	selectedCourses = [],
	onResetCourses,
	majors = DEFAULT_MAJORS,
}) {
	const handleMajorChange = (nextMajor) => {
		if (value && value !== nextMajor && selectedCourses.length > 0) {
			const confirmed = window.confirm('Changing major will clear selected completed courses. Continue?');
			if (!confirmed) {
				return;
			}
			onResetCourses?.();
		}
		onChange(nextMajor);
	};

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
					<option key={major} value={major}>
						{major}
					</option>
				))}
			</select>
		</div>
	);
}
