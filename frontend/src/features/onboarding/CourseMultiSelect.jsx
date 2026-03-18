export default function CourseMultiSelect({ major, options = [], value = [], onChange }) {
	if (!major) {
		return null;
	}

	if (options.length === 0) {
		return (
			<div style={{ marginBottom: 12, color: '#666' }}>
				No courses available for {major}. You can still submit onboarding.
			</div>
		);
	}

	const selectedKeys = new Set(value.map((item) => `${item.major}::${item.courseCode}`));

	const toggle = (course) => {
		const key = `${major}::${course.courseCode}`;
		const next = options
			.filter((item) => {
				const itemKey = `${major}::${item.courseCode}`;
				if (itemKey === key) {
					return !selectedKeys.has(key);
				}
				return selectedKeys.has(itemKey);
			})
			.map((item) => ({ major, courseCode: item.courseCode, courseUnitId: item.courseUnitId }));

		onChange(next);
	};

	return (
		<div style={{ marginBottom: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 4 }}>Completed courses (optional)</div>
			{options.map((course) => {
				const key = `${major}::${course.courseCode}`;
				const checked = selectedKeys.has(key);
				return (
					<label key={key} style={{ display: 'block', marginBottom: 4 }}>
						<input type="checkbox" checked={checked} onChange={() => toggle(course)} /> {course.courseCode} - {course.name}
					</label>
				);
			})}
		</div>
	);
}
