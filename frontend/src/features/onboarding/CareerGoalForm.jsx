import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function parseIsoDate(value) {
	if (!value || typeof value !== 'string') {
		return null;
	}
	const [year, month, day] = value.split('-').map((part) => Number(part));
	if (!year || !month || !day) {
		return null;
	}
	const date = new Date(year, month - 1, day);
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}
	return date;
}

function toIsoDateString(date) {
	if (!(date instanceof Date)) {
		return '';
	}
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export default function CareerGoalForm({ value, roleOptions = [], onChange, disabled = false }) {
	const careerGoal = value?.careerGoal || {};
	const hasRoleOptions = Array.isArray(roleOptions) && roleOptions.length > 0;
	const currentRole = careerGoal.role || '';
	const selectedRole = hasRoleOptions && roleOptions.includes(currentRole) ? currentRole : '';
	const rolePlaceholder = value?.major
		? hasRoleOptions
			? 'Select target role'
			: 'No role tracks available for selected major'
		: 'Select major first';

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
			<div className="onboarding-field">
				<label htmlFor="role" className="onboarding-label">
					Target role <span className="onboarding-label-optional"></span>
				</label>
				<select
					id="role"
					value={selectedRole}
					onChange={(event) => patch({ careerGoal: { role: event.target.value } })}
					disabled={disabled || !hasRoleOptions}
					className="onboarding-input onboarding-select"
				>
					<option value="">{rolePlaceholder}</option>
					{roleOptions.map((item) => (
						<option key={item} value={item}>
							{item}
						</option>
					))}
				</select>
			</div>

			<div className="onboarding-field">
				<label htmlFor="timeline" className="onboarding-label">
					Graduation date <span className="onboarding-label-optional">(optional)</span>
				</label>
				<DatePicker
					id="timeline"
					selected={parseIsoDate(careerGoal.graduationTimeline)}
					onChange={(nextDate) => patch({ careerGoal: { graduationTimeline: toIsoDateString(nextDate) } })}
					dateFormat="dd/MM/yyyy"
					placeholderText="DD/MM/YYYY"
					isClearable
					showPopperArrow={false}
					calendarStartDay={1}
					popperPlacement="bottom-start"
					popperClassName="onboarding-datepicker-popper"
					calendarClassName="onboarding-datepicker-calendar"
					className="onboarding-input"
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
