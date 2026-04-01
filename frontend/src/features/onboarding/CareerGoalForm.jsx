import FreeTextField from './FreeTextField';

const COMPANY_TYPES = ['Startup', 'Outsource', 'Product company', 'Japanese company', 'Big Tech'];

export default function CareerGoalForm({ value, onChange }) {
	const careerGoal = value?.careerGoal || {};

	const patch = (next) => {
		onChange({
			...value,
			...next,
			careerGoal: {
				...careerGoal,
				...(next.careerGoal || {}),
			},
		});
	};

	return (
		<div>
			<FreeTextField
				id="role"
				label="Target role"
				maxLength={500}
				value={careerGoal.role || ''}
				onChange={(next) => patch({ careerGoal: { role: next } })}
				placeholder="e.g. Backend Engineer"
			/>

			<div className="onboarding-field">
				<label htmlFor="companyType" className="onboarding-label">
					Company type <span className="onboarding-label-optional">(optional)</span>
				</label>
				<select
					id="companyType"
					value={careerGoal.companyType || ''}
					onChange={(event) => patch({ careerGoal: { companyType: event.target.value } })}
					className="onboarding-input onboarding-select"
				>
					<option value="">Select company type</option>
					{COMPANY_TYPES.map((item) => (
						<option key={item} value={item}>
							{item}
						</option>
					))}
				</select>
			</div>

			<FreeTextField
				id="timeline"
				label="Graduation timeline"
				maxLength={100}
				value={careerGoal.graduationTimeline || ''}
				onChange={(next) => patch({ careerGoal: { graduationTimeline: next } })}
				placeholder="e.g. 3 semesters or 2027-06"
			/>

			<FreeTextField
				id="aspirations"
				label="Personal aspirations"
				maxLength={1000}
				value={value?.personalAspirations || ''}
				onChange={(next) => patch({ personalAspirations: next })}
				placeholder="Tell us what you care about"
			/>
		</div>
	);
}
