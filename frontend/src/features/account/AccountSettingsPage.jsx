import { useEffect, useMemo, useState } from 'react';
import {
	Camera,
	CheckCircle2,
	Eye,
	EyeOff,
	Lock,
	Shield,
	User,
	UserX,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import accountApi from '../../services/account.api';
import useAccountSettingsStore from '../../stores/accountSettings.store';
import SiteFooter from '../general/SiteFooter';
import { useNotification } from '../general/NotificationContainer';
import { isPasswordPolicyValid, validateProfilePayload } from './accountSettings.validation';
import './account-settings-page.css';

const AVATAR_MAX_DIMENSION = 512;
const AVATAR_MAX_BYTES = 350 * 1024;

function estimateDataUrlBytes(dataUrl) {
	const base64 = String(dataUrl || '').split(',')[1] || '';
	return Math.floor((base64.length * 3) / 4);
}

function loadImageFromFile(file) {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Failed to decode image'));
		};
		image.src = objectUrl;
	});
}

async function compressAvatarFile(file) {
	const image = await loadImageFromFile(file);
	const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(image.width, image.height));
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Canvas is not supported in this browser');
	}

	context.drawImage(image, 0, 0, width, height);

	if (file.type === 'image/png') {
		return canvas.toDataURL('image/png');
	}

	const qualitySteps = [0.86, 0.75, 0.65, 0.55];
	let best = canvas.toDataURL('image/jpeg', qualitySteps[0]);

	for (const quality of qualitySteps) {
		const candidate = canvas.toDataURL('image/jpeg', quality);
		best = candidate;
		if (estimateDataUrlBytes(candidate) <= AVATAR_MAX_BYTES) {
			break;
		}
	}

	return best;
}

export default function AccountSettingsPage() {
	const { accessToken, logoutAndRedirect } = useAuth();
	const { addNotification } = useNotification();
	const {
		loading,
		setLoading,
		setError,
		resetStatus,
	} = useAccountSettingsStore();

	const [identity, setIdentity] = useState({
		email: '',
		displayName: '',
		fullName: '',
		privacySetting: 'identified',
		avatarUrl: '',
		effectiveDisplayName: 'Student',
	});
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [imageError, setImageError] = useState('');
	const [pageError, setPageError] = useState('');
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);

	const canSubmitPassword = useMemo(() => {
		return Boolean(currentPassword.trim()) && isPasswordPolicyValid(newPassword);
	}, [currentPassword, newPassword]);

	const passwordStrength = useMemo(() => {
		const value = String(newPassword || '');
		if (!value) {
			return { label: 'Empty', color: 'muted', score: 0 };
		}

		let score = 0;
		if (value.length >= 8) score += 1;
		if (/[A-Z]/.test(value)) score += 1;
		if (/[a-z]/.test(value)) score += 1;
		if (/\d/.test(value)) score += 1;
		if (/[@$!%*?&]/.test(value)) score += 1;

		if (score <= 2) {
			return { label: 'Weak', color: 'weak', score: 1 };
		}
		if (score === 3 || score === 4) {
			return { label: 'Medium', color: 'medium', score: 2 };
		}
		return { label: 'Strong', color: 'strong', score: 3 };
	}, [newPassword]);

	useEffect(() => {
		async function loadProfile() {
			if (!accessToken) {
				return;
			}

			setLoading(true);
			resetStatus();

			try {
				const result = await accountApi.getProfile(accessToken);
				const nextIdentity = result?.identity || {};
				setIdentity({
					email: nextIdentity.email || '',
					displayName: nextIdentity.displayName || '',
					fullName: nextIdentity.fullName || '',
					privacySetting: nextIdentity.privacySetting || 'identified',
					avatarUrl: nextIdentity.avatarUrl || '',
					effectiveDisplayName: nextIdentity.effectiveDisplayName || 'Student',
				});
			} catch (err) {
				if (err?.status === 401) {
					await logoutAndRedirect();
					return;
				}
				const message = err?.message || 'Failed to load account profile';
				setPageError(message);
				setError(message);
			} finally {
				setLoading(false);
			}
		}

		loadProfile();
	}, [accessToken, logoutAndRedirect, resetStatus, setError, setLoading]);

	async function onSaveProfile(event) {
		event.preventDefault();
		resetStatus();
		setImageError('');
		setPageError('');

		const payload = {
			displayName: identity.displayName,
			fullName: identity.fullName,
			privacySetting: identity.privacySetting,
			avatarUrl: identity.avatarUrl,
		};

		const validation = validateProfilePayload(payload);
		if (!validation.ok) {
			addNotification(Object.values(validation.errors)[0], 'error');
			return;
		}

		setLoading(true);
		try {
			const result = await accountApi.updateProfile(accessToken, payload);
			const profile = result?.profile || {};
			setIdentity((prev) => ({
				...prev,
				email: profile.email || prev.email,
				displayName: profile.displayName || '',
				fullName: profile.fullName || prev.fullName,
				privacySetting: profile.privacySetting || prev.privacySetting,
				avatarUrl: profile.avatarUrl || '',
				effectiveDisplayName: profile.effectiveDisplayName || prev.effectiveDisplayName,
			}));
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('account-profile-updated', {
						detail: {
							profile: {
								email: profile.email || identity.email,
								displayName: profile.displayName || identity.displayName,
								fullName: profile.fullName || identity.fullName,
								effectiveDisplayName: profile.effectiveDisplayName || identity.effectiveDisplayName,
								avatarUrl: profile.avatarUrl || '',
							},
						},
					})
				);
			}
			addNotification(result?.message || 'Profile updated', 'success');
		} catch (err) {
			const message = err?.message || 'Failed to update profile';
			addNotification(message, 'error');
			setError(message);
		} finally {
			setLoading(false);
		}
	}

	async function onImportImage(event) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (!file.type.startsWith('image/')) {
			setImageError('Only image files are supported');
			return;
		}

		try {
			const dataUrl = await compressAvatarFile(file);
			const compressedBytes = estimateDataUrlBytes(dataUrl);

			setImageError(
				compressedBytes > AVATAR_MAX_BYTES
					? 'Ảnh đã được nén nhưng vẫn còn lớn. Bạn nên dùng ảnh nhỏ hơn để tải nhanh hơn.'
					: ''
			);
			setIdentity((prev) => ({ ...prev, avatarUrl: dataUrl }));
		} catch (_) {
			setImageError('Failed to import image');
		}
	}

	function onDeleteImage() {
		setImageError('');
		setIdentity((prev) => ({ ...prev, avatarUrl: '' }));
	}

	async function onChangePassword(event) {
		event.preventDefault();
		resetStatus();
		setPageError('');

		if (!canSubmitPassword) {
			addNotification('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự @$!%*?&.', 'error');
			return;
		}

		setLoading(true);
		try {
			const result = await accountApi.changePassword(accessToken, {
				currentPassword,
				newPassword,
			});
			addNotification(result?.message || 'Password changed successfully', 'success');
			setCurrentPassword('');
			setNewPassword('');
		} catch (err) {
			const message = err?.message || 'Failed to change password';
			addNotification(message, 'error');
			setError(message);
		} finally {
			setLoading(false);
		}
	}

	const displayName = identity.displayName || identity.fullName || identity.effectiveDisplayName || 'Student';
	const avatarFallback =
		(displayName && displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : 'S');

	return (
		<div className="account-settings-page">
			<div className="account-settings-shell">
				<main className="account-settings-main">
					<header className="account-settings-header">
						<h1>Account Settings</h1>
						<p>
							Manage your academic profile, security preferences, and interface customization.
						</p>
						<p className="account-settings-effective-name">
							Effective display name: <strong>{identity.effectiveDisplayName}</strong>
						</p>
					</header>

					{pageError ? <p className="message error">{pageError}</p> : null}

					<section className="profile-grid">
						<div className="profile-avatar-card">
							<div className="avatar-wrap">
								{identity.avatarUrl ? (
									<img src={identity.avatarUrl} alt="Avatar preview" className="avatar-image" />
								) : (
									<div className="avatar-fallback">{avatarFallback}</div>
								)}
								<label htmlFor="avatarImport" className="avatar-edit-btn" title="Upload avatar">
									<Camera size={14} />
								</label>
							</div>
							<h3>{displayName}</h3>
							<p>{identity.email || 'student@vnu.edu.vn'}</p>
							<div className="avatar-actions">
								<input
									id="avatarImport"
									type="file"
									accept="image/*"
									onChange={onImportImage}
									hidden
								/>
								<label htmlFor="avatarImport" className="btn ghost">
									Import avatar
								</label>
								<button
									type="button"
									className="btn danger"
									onClick={onDeleteImage}
									disabled={loading || !identity.avatarUrl}
								>
									Delete image
								</button>
							</div>
							{imageError ? <p className="message error">{imageError}</p> : null}
						</div>

						<div className="profile-form-card">
							<div className="card-title-row">
								<User size={18} />
								<h2>Identity Details</h2>
							</div>
							<form onSubmit={onSaveProfile}>
								<div className="form-grid">
									<div className="field">
										<label htmlFor="fullName">Full Name</label>
										<input
											id="fullName"
											value={identity.fullName}
											onChange={(e) =>
												setIdentity((prev) => ({ ...prev, fullName: e.target.value }))
											}
										/>
									</div>
									<div className="field">
										<label htmlFor="displayName">Display Name</label>
										<input
											id="displayName"
											value={identity.displayName}
											onChange={(e) =>
												setIdentity((prev) => ({ ...prev, displayName: e.target.value }))
											}
										/>
									</div>
									<div className="field field-wide">
										<label htmlFor="email">Email Address</label>
										<input id="email" value={identity.email} disabled readOnly />
									</div>
								</div>
								<div className="card-actions">
									<button type="submit" className="btn primary" disabled={loading}>
										Save Changes
									</button>
								</div>
							</form>
						</div>
					</section>

					<section className="secondary-grid">
						<div className="security-card">
							<div className="card-head-between">
								<div className="card-title-row">
									<Lock size={18} />
									<h2>Security</h2>
								</div>
								<span className="security-chip">Strong Security</span>
							</div>

							<form onSubmit={onChangePassword}>
								<div className="field">
									<label htmlFor="currentPassword">Current Password</label>
									<div className="password-wrap">
										<input
											id="currentPassword"
											type={showCurrentPassword ? 'text' : 'password'}
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
										/>
										<button
											type="button"
											className="icon-btn"
											onClick={() => setShowCurrentPassword((v) => !v)}
										>
											{showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</div>

								<div className="field">
									<label htmlFor="newPassword">New Password</label>
									<div className="password-wrap">
										<input
											id="newPassword"
											type={showNewPassword ? 'text' : 'password'}
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
										/>
										<button
											type="button"
											className="icon-btn"
											onClick={() => setShowNewPassword((v) => !v)}
										>
											{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
									<div className="strength-wrap">
										<div className="strength-bars">
											<span className={passwordStrength.score >= 1 ? `bar ${passwordStrength.color}` : 'bar'} />
											<span className={passwordStrength.score >= 2 ? `bar ${passwordStrength.color}` : 'bar'} />
											<span className={passwordStrength.score >= 3 ? `bar ${passwordStrength.color}` : 'bar'} />
										</div>
										<div className="strength-meta">
											<span>Password: {passwordStrength.label}</span>
											<span>{canSubmitPassword ? 'Policy valid' : 'At least 8 chars + upper + lower + number + @$!%*?&'}</span>
										</div>
									</div>
								</div>

								<div className="card-head-between card-divider-top">
									<p>Last changed 3 months ago</p>
									<button type="submit" className="btn subtle" disabled={loading || !canSubmitPassword}>
										Update Password
									</button>
								</div>
							</form>
						</div>

						<div className="privacy-card">
							<div className="card-title-row">
								<Shield size={18} />
								<h2>Privacy Settings</h2>
							</div>
							<p>
								Choose how you appear in community features and collaborative tools across the platform.
							</p>
							<div className="privacy-options">
								<label className={identity.privacySetting === 'identified' ? 'privacy-option selected' : 'privacy-option'}>
									<input
										type="radio"
										name="privacy_mode"
										checked={identity.privacySetting === 'identified'}
										onChange={() => setIdentity((prev) => ({ ...prev, privacySetting: 'identified' }))}
									/>
									<div className="privacy-content">
										<User size={20} />
										<div>
											<strong>Identified</strong>
											<span>Show full name and ID to peers</span>
										</div>
									</div>
									{identity.privacySetting === 'identified' ? <CheckCircle2 size={18} /> : null}
								</label>

								<label className={identity.privacySetting === 'anonymous' ? 'privacy-option selected' : 'privacy-option'}>
									<input
										type="radio"
										name="privacy_mode"
										checked={identity.privacySetting === 'anonymous'}
										onChange={() => setIdentity((prev) => ({ ...prev, privacySetting: 'anonymous' }))}
									/>
									<div className="privacy-content">
										<UserX size={20} />
										<div>
											<strong>Anonymous</strong>
											<span>Hide identity in shared spaces</span>
										</div>
									</div>
									{identity.privacySetting === 'anonymous' ? <CheckCircle2 size={18} /> : null}
								</label>
							</div>
							<button
								type="button"
								className="btn subtle full"
								onClick={onSaveProfile}
								disabled={loading}
							>
								Save Privacy Preference
							</button>
						</div>
					</section>
				</main>

				<SiteFooter />
			</div>
		</div>
	);
}
