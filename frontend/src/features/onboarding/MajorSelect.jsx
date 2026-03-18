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
		<div style={{ marginBottom: 12 }}>
			<label htmlFor="major" style={{ display: 'block', fontWeight: 600 }}>
				Major <span style={{ color: '#b00020' }}>*</span>
			</label>
			<select
				id="major"
				value={value || ''}
				onChange={(event) => handleMajorChange(event.target.value)}
				style={{ width: '100%', padding: 8, marginTop: 4 }}
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
