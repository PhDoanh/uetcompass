import { useEffect, useMemo, useState } from 'react';
import authApi from '../../services/auth.api';
import { useAuth } from '../../providers/AuthProvider';
import { getCourseCatalog } from '../../services/onboarding.api';
import MajorSelect from './MajorSelect';
import CourseMultiSelect from './CourseMultiSelect';
import CareerGoalForm from './CareerGoalForm';
import './onboarding-panel.css';

function mapCompletedCourses(major, completedCourseIds = [], catalogByMajor = {}) {
	if (!major) {
		return [];
	}

	const options = Array.isArray(catalogByMajor?.[major]) ? catalogByMajor[major] : [];
	const byCourseCode = new Map(options.map((item) => [String(item.courseCode || '').trim(), item]));
	const byCourseUnitId = new Map(options.map((item) => [String(item.courseUnitId || '').trim(), item]));

	const unique = new Map();
	for (const rawId of completedCourseIds) {
		const nextId = String(rawId || '').trim();
		if (!nextId) {
			continue;
		}

		const fromCode = byCourseCode.get(nextId);
		const fromUnitId = byCourseUnitId.get(nextId);
		const resolved = fromCode || fromUnitId;

		const courseCode = resolved?.courseCode ? String(resolved.courseCode).trim() : nextId;
		const courseUnitId = resolved?.courseUnitId ? String(resolved.courseUnitId).trim() : undefined;
		const key = `${major}::${courseCode}`;

		unique.set(key, {
			major,
			courseCode,
			...(courseUnitId ? { courseUnitId } : {}),
		});
	}

	return [...unique.values()];
}

function mapProfileToOnboardingForm(profile, catalogByMajor = {}) {
	const source = profile?.profile || {};
	const major = String(source?.major || '').trim();
	const completedCourseIds = Array.isArray(source?.completedCourseIds) ? source.completedCourseIds : [];
	const careerGoal = source?.careerGoal || {};

	return {
		major,
		completedCourses: mapCompletedCourses(major, completedCourseIds, catalogByMajor),
		careerGoal: {
			role: String(careerGoal?.role || '').trim(),
			companyType: String(careerGoal?.companyType || '').trim(),
			graduationTimeline: String(careerGoal?.graduationTimeline || '').trim(),
		},
		personalAspirations: String(source?.personalAspirations || '').trim(),
	};
}

function serializeProfileForm(profile = {}) {
	const major = String(profile?.major || '').trim();
	const completedCourses = Array.isArray(profile?.completedCourses) ? profile.completedCourses : [];
	const completedCourseIds = completedCourses
		.map((item) => item?.courseUnitId || item?.courseCode)
		.filter(Boolean)
		.sort();

	return JSON.stringify({
		major,
		completedCourseIds,
		careerGoal: {
			role: String(profile?.careerGoal?.role || '').trim(),
			companyType: String(profile?.careerGoal?.companyType || '').trim(),
			graduationTimeline: String(profile?.careerGoal?.graduationTimeline || '').trim(),
		},
		personalAspirations: String(profile?.personalAspirations || '').trim(),
	});
}

export default function LearningProfilePage() {
	const { accessToken, logoutAndRedirect } = useAuth();
	const [form, setForm] = useState(mapProfileToOnboardingForm(null, {}));
	const [initialSerialized, setInitialSerialized] = useState(() => serializeProfileForm(mapProfileToOnboardingForm(null, {})));
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [statusError, setStatusError] = useState('');
	const [saving, setSaving] = useState(false);
	const [showRegenRoadmap, setShowRegenRoadmap] = useState(false);

	const [catalogLoading, setCatalogLoading] = useState(true);
	const [catalogError, setCatalogError] = useState('');
	const [catalogMajors, setCatalogMajors] = useState([]);
	const [catalogByMajor, setCatalogByMajor] = useState({});
	const [roleOptionsByMajor, setRoleOptionsByMajor] = useState({});
	const [requiredCourseLinks, setRequiredCourseLinks] = useState({});

	const currentSerialized = useMemo(() => serializeProfileForm(form), [form]);
	const hasChanges = currentSerialized !== initialSerialized;
	const courseOptions = useMemo(() => catalogByMajor[form.major] || [], [catalogByMajor, form.major]);
	const roleOptions = useMemo(() => roleOptionsByMajor[form.major] || [], [roleOptionsByMajor, form.major]);
	const requiredCourseLink = useMemo(() => requiredCourseLinks[form.major] || null, [requiredCourseLinks, form.major]);

	const patchForm = (next) => {
		setForm(next);
		setStatusMessage('');
		setStatusError('');
	};

	const handleMajorChange = (major) => {
		const nextRoleOptions = roleOptionsByMajor[major] || [];
		const currentRole = form?.careerGoal?.role || '';
		const keepRole = currentRole && nextRoleOptions.includes(currentRole);

		patchForm({
			...form,
			major,
			careerGoal: {
				...(form.careerGoal || {}),
				role: keepRole ? currentRole : '',
			},
		});
	};

	const handleSaveProfile = async () => {
		setStatusMessage('');
		setStatusError('');
		setSaving(true);

		const major = String(form?.major || '').trim();
		const completedCourses = Array.isArray(form?.completedCourses) ? form.completedCourses : [];
		const completedCourseIds = completedCourses
			.map((item) => item?.courseUnitId || item?.courseCode)
			.filter(Boolean);

		try {
			await authApi.patchProfile(accessToken, {
				profile: {
					major,
					completedCourseIds,
					careerGoal: {
						role: String(form?.careerGoal?.role || '').trim(),
						companyType: String(form?.careerGoal?.companyType || '').trim(),
						graduationTimeline: String(form?.careerGoal?.graduationTimeline || '').trim(),
					},
					personalAspirations: String(form?.personalAspirations || '').trim(),
				},
			});

			setInitialSerialized(serializeProfileForm(form));
			setShowRegenRoadmap(true);
			setStatusMessage('Save profile thành công.');
		} catch (err) {
			if (err?.status === 401) {
				await logoutAndRedirect();
				return;
			}

			setStatusError(err?.message || 'Lưu profile thất bại.');
		} finally {
			setSaving(false);
		}
	};

	const handleRegenRoadmap = () => {
		setStatusError('');
		setStatusMessage('Đã gửi yêu cầu Regen Roadmap thành công (tạm thời).');
	};

	useEffect(() => {
		let isMounted = true;

		async function loadData() {
			if (!accessToken) {
				if (isMounted) {
					setLoading(false);
					setCatalogLoading(false);
				}
				return;
			}

			setLoading(true);
			setCatalogLoading(true);
			setError('');
			setCatalogError('');

			try {
				const [profilePayload, catalogPayload] = await Promise.all([
					authApi.getProfile(accessToken),
					getCourseCatalog(accessToken),
				]);

				if (isMounted) {
					const nextCatalogByMajor =
						catalogPayload?.courseCatalog && typeof catalogPayload.courseCatalog === 'object'
							? catalogPayload.courseCatalog
							: {};
					const mapped = mapProfileToOnboardingForm(profilePayload, nextCatalogByMajor);

					setForm(mapped);
					setInitialSerialized(serializeProfileForm(mapped));
					setCatalogMajors(Array.isArray(catalogPayload?.majors) ? catalogPayload.majors : []);
					setCatalogByMajor(nextCatalogByMajor);
					setRoleOptionsByMajor(catalogPayload?.roleOptionsByMajor && typeof catalogPayload.roleOptionsByMajor === 'object' ? catalogPayload.roleOptionsByMajor : {});
					setRequiredCourseLinks(catalogPayload?.requiredCourseLinks && typeof catalogPayload.requiredCourseLinks === 'object' ? catalogPayload.requiredCourseLinks : {});
				}
			} catch (err) {
				if (err?.status === 401) {
					await logoutAndRedirect();
					return;
				}

				if (isMounted) {
					setError(err?.message || 'Failed to load learning profile.');
					setCatalogError(err?.message || 'Failed to load catalog.');
				}
			} finally {
				if (isMounted) {
					setLoading(false);
					setCatalogLoading(false);
				}
			}
		}

		loadData();

		return () => {
			isMounted = false;
		};
	}, [accessToken, logoutAndRedirect]);

	return (
		<main className="learning-profile-page">
			{loading ? <div style={{ marginBottom: 12 }}>Loading learning profile...</div> : null}
			{error ? <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div> : null}
			{!loading && !error ? (
				<section className="learning-profile-content">
					<h2 className="onboarding-panel-title">Learning Profile</h2>
					<p className="onboarding-panel-description">Nội dung onboarding đã lưu. Bạn có thể chỉnh sửa và lưu lại.</p>

					{catalogLoading ? <div className="onboarding-panel-note">Loading majors and courses...</div> : null}
					{catalogError ? <div className="onboarding-panel-error">{catalogError}</div> : null}

					<MajorSelect
						value={form.major}
						selectedCourses={form.completedCourses || []}
						onResetCourses={() => patchForm({ ...form, completedCourses: [] })}
						onChange={handleMajorChange}
						majors={catalogMajors}
					/>

					<CourseMultiSelect
						major={form.major}
						requiredCourseLink={requiredCourseLink}
						options={courseOptions}
						value={form.completedCourses || []}
						onChange={(completedCourses) => patchForm({ ...form, completedCourses })}
					/>

					<CareerGoalForm value={form} roleOptions={roleOptions} onChange={patchForm} />

					<div className="learning-profile-actions">
						{hasChanges ? (
							<button type="button" className="primary-btn" onClick={handleSaveProfile} disabled={saving}>
								{saving ? 'Saving...' : 'Save profile'}
							</button>
						) : null}
						{showRegenRoadmap ? (
							<button type="button" className="secondary-btn" onClick={handleRegenRoadmap}>
								Regen roadmap
							</button>
						) : null}
					</div>

					{statusError ? <div className="onboarding-panel-error">{statusError}</div> : null}
					{statusMessage ? <div className="learning-profile-success">{statusMessage}</div> : null}
				</section>
			) : null}
		</main>
	);
}