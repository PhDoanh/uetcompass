import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import accountApi from '../../services/account.api';
import useAccountSettingsStore from '../../stores/accountSettings.store';
import { isPasswordPolicyValid, validateProfilePayload } from './accountSettings.validation';

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
	const [profileStatus, setProfileStatus] = useState({ error: '', success: '' });
	const [passwordStatus, setPasswordStatus] = useState({ error: '', success: '' });

	const canSubmitPassword = useMemo(() => {
		return Boolean(currentPassword.trim()) && isPasswordPolicyValid(newPassword);
	}, [currentPassword, newPassword]);

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
				setPageError(err?.message || 'Failed to load account profile');
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
		setProfileStatus({ error: '', success: '' });

		const payload = {
			displayName: identity.displayName,
			fullName: identity.fullName,
			privacySetting: identity.privacySetting,
			avatarUrl: identity.avatarUrl,
		};

		const validation = validateProfilePayload(payload);
		if (!validation.ok) {
			setProfileStatus({ error: Object.values(validation.errors)[0], success: '' });
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
			setProfileStatus({ error: '', success: result?.message || 'Profile updated' });
		} catch (err) {
			setProfileStatus({ error: err?.message || 'Failed to update profile', success: '' });
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
		setPasswordStatus({ error: '', success: '' });

		if (!canSubmitPassword) {
			setPasswordStatus({
				error: 'Mật khẩu mới phải có ít nhất 8 ký tự gồm chữ, số và ký tự đặc biệt',
				success: '',
			});
			return;
		}

		setLoading(true);
		try {
			const result = await accountApi.changePassword(accessToken, {
				currentPassword,
				newPassword,
			});
			setPasswordStatus({ error: '', success: result?.message || 'Password changed successfully' });
			setCurrentPassword('');
			setNewPassword('');
		} catch (err) {
			setPasswordStatus({ error: err?.message || 'Failed to change password', success: '' });
		} finally {
			setLoading(false);
		}
	}

	return (
		<main style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
			<h1>Account Settings</h1>
			<p>Effective display name: <strong>{identity.effectiveDisplayName}</strong></p>

			{pageError ? <p style={{ color: '#b00020' }}>{pageError}</p> : null}

			<section style={{ marginTop: 24 }}>
				<h2>Profile</h2>
				<form onSubmit={onSaveProfile}>
					<label htmlFor="email">Email</label>
					<input
						id="email"
						value={identity.email}
						disabled
						readOnly
						style={{ display: 'block', width: '100%', marginBottom: 12, backgroundColor: '#f5f5f5' }}
					/>

					<label htmlFor="displayName">Display Name</label>
					<input
						id="displayName"
						value={identity.displayName}
						onChange={(e) => setIdentity((prev) => ({ ...prev, displayName: e.target.value }))}
						style={{ display: 'block', width: '100%', marginBottom: 12 }}
					/>

					<label htmlFor="fullName">Full Name</label>
					<input
						id="fullName"
						value={identity.fullName}
						onChange={(e) => setIdentity((prev) => ({ ...prev, fullName: e.target.value }))}
						style={{ display: 'block', width: '100%', marginBottom: 12 }}
					/>

					<label htmlFor="privacySetting">Privacy Setting</label>
					<select
						id="privacySetting"
						value={identity.privacySetting}
						onChange={(e) => setIdentity((prev) => ({ ...prev, privacySetting: e.target.value }))}
						style={{ display: 'block', width: '100%', marginBottom: 12 }}
					>
						<option value="identified">identified</option>
						<option value="anonymous">anonymous</option>
					</select>

					<label htmlFor="avatarImport">Import Avatar</label>
					<input
						id="avatarImport"
						type="file"
						accept="image/*"
						onChange={onImportImage}
						style={{ display: 'block', width: '100%', marginBottom: 12 }}
					/>

					<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
						<button type="button" onClick={onDeleteImage} disabled={loading || !identity.avatarUrl}>
							Delete image
						</button>
					</div>

					{imageError ? <p style={{ color: '#b00020' }}>{imageError}</p> : null}
					{identity.avatarUrl ? (
						<img
							src={identity.avatarUrl}
							alt="Avatar preview"
							style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '50%', marginBottom: 12 }}
						/>
					) : null}

					<button type="submit" disabled={loading}>Save profile</button>
					{profileStatus.error ? <p style={{ color: '#b00020' }}>{profileStatus.error}</p> : null}
					{profileStatus.success ? <p style={{ color: '#1b5e20' }}>{profileStatus.success}</p> : null}
				</form>
			</section>

			<section style={{ marginTop: 24 }}>
				<h2>Change Password</h2>
				<form onSubmit={onChangePassword}>
					<label htmlFor="currentPassword">Current Password</label>
					<input
						id="currentPassword"
						type="password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						style={{ display: 'block', width: '100%', marginBottom: 12 }}
					/>

					<label htmlFor="newPassword">New Password</label>
					<input
						id="newPassword"
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						style={{ display: 'block', width: '100%', marginBottom: 12 }}
					/>

					<button type="submit" disabled={loading}>Change password</button>
					{passwordStatus.error ? <p style={{ color: '#b00020' }}>{passwordStatus.error}</p> : null}
					{passwordStatus.success ? <p style={{ color: '#1b5e20' }}>{passwordStatus.success}</p> : null}
				</form>
			</section>

		</main>
	);
}
