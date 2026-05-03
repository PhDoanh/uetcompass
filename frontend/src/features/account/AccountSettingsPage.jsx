import { useEffect, useMemo, useState } from 'react';
import {
	AlertTriangle,
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
import '../onboarding/onboarding-panel.css';

const AVATAR_MAX_DIMENSION = 512;
const AVATAR_MAX_BYTES = 350 * 1024;
const ACCOUNT_DELETE_CONFIRM_TEXT = 'DELETE';

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
	const [avatarBroken, setAvatarBroken] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [accountDeleteConfirm, setAccountDeleteConfirm] = useState('');
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

	const canDeleteAccount = useMemo(() => {
		return accountDeleteConfirm.trim().toUpperCase() === ACCOUNT_DELETE_CONFIRM_TEXT;
	}, [accountDeleteConfirm]);

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
				setAvatarBroken(false);
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

	async function onHardDeleteAccount(event) {
		event.preventDefault();
		resetStatus();
		setPageError('');

		if (!canDeleteAccount) {
			addNotification(`Type ${ACCOUNT_DELETE_CONFIRM_TEXT} to confirm account deletion.`, 'error');
			return;
		}

		setIsDeleteModalOpen(true);
	}

	function closeDeleteModal() {
		if (loading) {
			return;
		}
		setIsDeleteModalOpen(false);
	}

	async function confirmHardDeleteAccount() {
		setIsDeleteModalOpen(false);

		setLoading(true);
		try {
			const result = await accountApi.deleteAccount(accessToken);
			addNotification(result?.message || 'Account deleted permanently.', 'success');
			await logoutAndRedirect();
		} catch (err) {
			const message = err?.message || 'Failed to delete account';
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
					</header>

					{pageError ? <p className="message error">{pageError}</p> : null}

					<section className="account-settings-identity">
						<div className="learning-profile-avatar-wrap">
							<div className="learning-profile-avatar-ring">
								{identity.avatarUrl && !avatarBroken ? (
									<img
										src={identity.avatarUrl}
										alt={displayName}
										className="learning-profile-avatar"
										onError={() => setAvatarBroken(true)}
									/>
								) : (
									<div className="learning-profile-avatar learning-profile-avatar--fallback">
										{displayName.charAt(0).toUpperCase() || 'U'}
									</div>
								)}
							</div>
						</div>
						<div className="account-settings-identity-info">
							<h2>{displayName}</h2>
							<p className="account-settings-email">{identity.email || 'student@vnu.edu.vn'}</p>
							{/* External notifications toggle removed */}
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

					<section className="danger-zone-card">
						<div className="card-title-row danger-title-row">
							<AlertTriangle size={18} />
							<h2>Danger Zone</h2>
						</div>
						<p>
							Hard delete will permanently remove this account and all related data in the
							database.
						</p>
						<form onSubmit={onHardDeleteAccount}>
							<div className="field">
								<label htmlFor="accountDeleteConfirm">
									Type {ACCOUNT_DELETE_CONFIRM_TEXT} to confirm
								</label>
								<input
									id="accountDeleteConfirm"
									value={accountDeleteConfirm}
									onChange={(event) => setAccountDeleteConfirm(event.target.value)}
									placeholder={ACCOUNT_DELETE_CONFIRM_TEXT}
									disabled={loading}
								/>
							</div>
							<div className="danger-actions">
								<button
									type="submit"
									className="btn danger solid"
									disabled={loading || !canDeleteAccount}
								>
									Delete Account Permanently
								</button>
							</div>
						</form>
					</section>
				</main>

				<SiteFooter />
			</div>

			{isDeleteModalOpen ? (
				<div
					className="account-delete-modal-overlay"
					onClick={closeDeleteModal}
					role="dialog"
					aria-modal="true"
					aria-labelledby="account-delete-modal-title"
				>
					<div className="account-delete-modal" onClick={(event) => event.stopPropagation()}>
						<div className="account-delete-modal__title-row">
							<AlertTriangle size={18} />
							<h3 id="account-delete-modal-title">Xác nhận xóa tài khoản</h3>
						</div>
						<p>
							Hành động này sẽ xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan. Bạn có chắc chắn muốn tiếp tục?
						</p>
						<div className="account-delete-modal__actions">
							<button type="button" className="btn subtle" onClick={closeDeleteModal} disabled={loading}>
								Hủy
							</button>
							<button type="button" className="btn danger solid" onClick={confirmHardDeleteAccount} disabled={loading}>
								Xóa vĩnh viễn
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
