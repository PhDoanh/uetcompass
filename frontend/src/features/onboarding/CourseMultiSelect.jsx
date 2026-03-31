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
			<div className="course-select-container course-options-scroll">
				{options.map((course) => {
					const key = `${major}::${course.courseCode}`;
					const checked = selectedKeys.has(key);
					return (
						<label key={key} className="course-checkbox-item" style={{ color: checked ? '#38bdf8' : 'inherit', fontWeight: checked ? 700 : 500 }}>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => toggle(course)}
								className="course-checkbox-input"
							/>
							<span>{course.courseCode} - {course.name}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}
