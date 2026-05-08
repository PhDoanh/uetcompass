import { useEffect, useState } from 'react';

export default function CourseMultiSelect({ major, requiredCourseLink, options = [], value = [], onChange, disabled = false }) {
	const [showAllCourses, setShowAllCourses] = useState(false);

	useEffect(() => {
		setShowAllCourses(false);
	}, [major]);

	if (!major) {
		return null;
	}

	if (disabled) {
		return (
			<div style={{ marginBottom: 12 }}>
				{requiredCourseLink ? (
					<div style={{ marginBottom: 8 }}>
						<a href={requiredCourseLink} target="_blank" rel="noreferrer" className="onboarding-link">
							Required Courses
						</a>
					</div>
				) : null}
				<div style={{ fontWeight: 600, marginBottom: 4 }}>Completed courses</div>
				{value.length > 0 ? (
					<div className="course-select-container" style={{ padding: 12 }}>
						{value.map((item) => (
							<div key={`${item.major}::${item.courseCode}`} style={{ marginBottom: 6 }}>
								{item.courseCode}
							</div>
						))}
					</div>
				) : (
					<div style={{ color: '#666' }}>No completed courses recorded.</div>
				)}
			</div>
		);
	}

	if (options.length === 0) {
		return (
			<div style={{ marginBottom: 12 }}>
				{requiredCourseLink ? (
					<a href={requiredCourseLink} target="_blank" rel="noreferrer" className="onboarding-link">
						Required Courses
					</a>
				) : null}
				<div style={{ color: '#666', marginTop: requiredCourseLink ? 8 : 0 }}>
					No elective courses available for {major}. You can still submit onboarding.
				</div>
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
			{requiredCourseLink ? (
				<div style={{ marginBottom: 8 }}>
					<a href={requiredCourseLink} target="_blank" rel="noreferrer" className="onboarding-link">
						Required Courses
					</a>
				</div>
			) : null}
			<div style={{ fontWeight: 600, marginBottom: 4 }}>Completed courses</div>
			<button
				type="button"
				className="secondary-btn"
				onClick={() => setShowAllCourses((prev) => !prev)}
				style={{ marginTop: 10, padding: '8px 12px', fontSize: '0.86rem' }}
			>
				{showAllCourses ? 'Hide elective courses' : 'Show elective courses'}
			</button>

			{showAllCourses ? (
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
			) : null}
		</div>
	);
}
