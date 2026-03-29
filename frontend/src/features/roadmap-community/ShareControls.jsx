import { useMemo, useState } from 'react';
import {
	createShareLink,
	updateShareLinkAccess,
	revokeShareLink,
} from '../../services/roadmapCommunity.api';

export function parseAllowedUserIdsInput(raw) {
	return [...new Set(
		String(raw || '')
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean)
	)];
}

export default function ShareControls({ authToken }) {
	const token = authToken || (typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [shareInfo, setShareInfo] = useState(null);
	const [accessMode, setAccessMode] = useState('private');
	const [allowedUsersInput, setAllowedUsersInput] = useState('');

	const allowedUserIds = useMemo(() => parseAllowedUserIdsInput(allowedUsersInput), [allowedUsersInput]);

	async function handleCreateShareLink() {
		setLoading(true);
		setError('');
		try {
			const data = await createShareLink(token);
			setShareInfo(data);
			setAccessMode(data.accessMode || 'private');
		} catch (err) {
			setError(err?.message || 'Failed to create share link');
		} finally {
			setLoading(false);
		}
	}

	async function handleUpdateAccess() {
		if (!shareInfo?.token) return;
		setLoading(true);
		setError('');
		try {
			const data = await updateShareLinkAccess(token, shareInfo.token, {
				accessMode,
				allowedUserIds,
			});
			setShareInfo((prev) => ({ ...prev, ...data }));
		} catch (err) {
			setError(err?.message || 'Failed to update access mode');
		} finally {
			setLoading(false);
		}
	}

	async function handleRevoke() {
		if (!shareInfo?.token) return;
		setLoading(true);
		setError('');
		try {
			await revokeShareLink(token, shareInfo.token);
			setShareInfo(null);
			setAccessMode('private');
			setAllowedUsersInput('');
		} catch (err) {
			setError(err?.message || 'Failed to revoke share link');
		} finally {
			setLoading(false);
		}
	}

	return (
		<section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
			<h2 style={{ marginTop: 0 }}>Share Roadmap Snapshot</h2>
			<p style={{ marginTop: 0, color: '#4a4a4a' }}>
				Create an immutable share link, then switch access mode without changing the URL token.
			</p>

			{error ? <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div> : null}

			{shareInfo ? (
				<div style={{ display: 'grid', gap: 12 }}>
					<div>
						<strong>Share URL:</strong>{' '}
						<a href={shareInfo.shareUrl} target="_blank" rel="noreferrer">
							{shareInfo.shareUrl}
						</a>
					</div>

					<label htmlFor="accessMode">Access mode</label>
					<select
						id="accessMode"
						value={accessMode}
						onChange={(e) => setAccessMode(e.target.value)}
						disabled={loading}
					>
						<option value="private">private</option>
						<option value="users-only">users-only</option>
						<option value="public">public</option>
					</select>

					{accessMode === 'users-only' ? (
						<div>
							<label htmlFor="allowedUsers">Allowed user IDs (comma separated)</label>
							<input
								id="allowedUsers"
								value={allowedUsersInput}
								onChange={(e) => setAllowedUsersInput(e.target.value)}
								placeholder="userA, userB"
								disabled={loading}
								style={{ width: '100%' }}
							/>
						</div>
					) : null}

					<div style={{ display: 'flex', gap: 8 }}>
						<button type="button" onClick={handleUpdateAccess} disabled={loading}>
							Save Access Mode
						</button>
						<button type="button" onClick={handleRevoke} disabled={loading} style={{ background: '#f6dada' }}>
							Revoke Link
						</button>
					</div>
				</div>
			) : (
				<button type="button" onClick={handleCreateShareLink} disabled={loading || !token}>
					Create Share Link
				</button>
			)}
		</section>
	);
}
