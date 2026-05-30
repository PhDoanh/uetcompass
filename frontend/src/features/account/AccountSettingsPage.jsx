import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	AlertTriangle,
	Bell,
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
import { useNotification } from '../notification/NotificationContainer';
import { isPasswordPolicyValid, validateProfilePayload } from './accountSettings.validation';
import './account-settings-page.css';
import '../onboarding/onboarding-panel.css';

const ACCOUNT_DELETE_CONFIRM_TEXT = 'Delete';

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
	const [pageError, setPageError] = useState('');
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [accountDeleteConfirm, setAccountDeleteConfirm] = useState('');
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);

	useEffect(() => {
		if (typeof document === 'undefined') {
			return undefined;
		}

		const bodyStyle = document.body.style;
		const previousOverflow = bodyStyle.overflow;
		const previousPaddingRight = bodyStyle.paddingRight;

		if (isDeleteModalOpen) {
			const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
			bodyStyle.overflow = 'hidden';
			bodyStyle.paddingRight = scrollBarWidth > 0 ? `${scrollBarWidth}px` : previousPaddingRight;
		}

		return () => {
			bodyStyle.overflow = previousOverflow;
			bodyStyle.paddingRight = previousPaddingRight;
		};
	}, [isDeleteModalOpen]);

	const canSubmitPassword = useMemo(() => {
		return Boolean(currentPassword.trim()) && isPasswordPolicyValid(newPassword);
	}, [currentPassword, newPassword]);

	const canDeleteAccount = useMemo(() => {
		return accountDeleteConfirm.trim().toLowerCase() === ACCOUNT_DELETE_CONFIRM_TEXT.toLowerCase();
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
	const bioDept = identity.department || identity.bio || 'Chưa cập nhật';

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

					<section className="account-top-grid">
						<div className="profile-avatar-card profile-card">
							<div className="card-title-row">
								<User size={18} />
								<h2>Profile</h2>
							</div>
							<div className="profile-card__content">
								<div className="avatar-wrap">
									{identity.avatarUrl ? (
										<img src={identity.avatarUrl} alt="Avatar preview" className="avatar-image" />
									) : (
										<div className="avatar-fallback">{avatarFallback}</div>
									)}
								</div>
								<div className="profile-card__info">
									<div>
										<span className="profile-card__label">Username</span>
										<strong>{displayName}</strong>
									</div>
									<div>
										<span className="profile-card__label">Email</span>
										<strong>{identity.email || 'student@vnu.edu.vn'}</strong>
									</div>
									<div>
										<span className="profile-card__label">Bio/Dept</span>
										<strong>{bioDept}</strong>
									</div>
								</div>
							</div>
						</div>

						<div className="privacy-card">
							<div className="card-title-row">
								<Shield size={18} />
								<h2>Privacy Settings</h2>
							</div>
							<div className="privacy-options horizontal">
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
							<div className="card-actions align-right">
								<button
									type="button"
									className="btn subtle btn-sm"
									onClick={onSaveProfile}
									disabled={loading}
								>
									Save Privacy Preferences
								</button>
							</div>
						</div>
					</section>

					<section className="account-bottom-grid">
						<div className="security-card">
							<div className="card-title-row">
								<Lock size={18} />
								<h2>Security</h2>
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
									<p className="field-helper">
										Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự @$!%*?&.
									</p>
								</div>

								<div className="card-head-between card-divider-top">
									<p>Last change 2 month ago</p>
									<button type="submit" className="btn subtle" disabled={loading || !canSubmitPassword}>
										Update Password
									</button>
								</div>
							</form>
						</div>

						<div className="notification-card">
							<div className="card-title-row">
								<Bell size={18} />
								<h2>Notification</h2>
							</div>
							<div className="notification-box">
								<div className="notification-row">
									<div>
										<h3>External Notifications</h3>
										<p>
											Choose how you would like to receive alerts outside of this application...
										</p>
									</div>
									<label className="toggle-switch">
										<input
											type="checkbox"
											aria-label="Enable external notifications"
											checked={isNotificationEnabled}
											onChange={() => setIsNotificationEnabled((prev) => !prev)}
										/>
										<span className="toggle-track" aria-hidden="true">
											<span className="toggle-thumb" />
										</span>
									</label>
								</div>
							</div>
						</div>
					</section>

					<section className="danger-zone-card">
						<div className="card-title-row danger-title-row">
							<AlertTriangle size={18} />
							<h2>Danger Zone</h2>
						</div>
						<p>
							Remove this account and all related data. Type Delete to confirm.
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

			{isDeleteModalOpen && typeof document !== 'undefined'
				? createPortal(
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
					</div>,
					document.body
				)
				: null}
		</div>
	);
}
