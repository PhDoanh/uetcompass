import { useState } from 'react';
import { publishPost, unpublishMyPost } from '../../services/roadmapCommunity.api';

export default function PublishControls({ authToken, sharedRoadmapId }) {
	const token = authToken || (typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [published, setPublished] = useState(false);

	async function handlePublish() {
		setLoading(true);
		setError('');
		try {
			await publishPost(token, sharedRoadmapId);
			setPublished(true);
		} catch (err) {
			setError(err?.message || 'Failed to publish post');
		} finally {
			setLoading(false);
		}
	}

	async function handleUnpublish() {
		setLoading(true);
		setError('');
		try {
			await unpublishMyPost(token);
			setPublished(false);
		} catch (err) {
			setError(err?.message || 'Failed to unpublish post');
		} finally {
			setLoading(false);
		}
	}

	return (
		<section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
			<h3 style={{ marginTop: 0 }}>Community Publication</h3>
			{error ? <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div> : null}
			{published ? (
				<button type="button" onClick={handleUnpublish} disabled={loading}>
					Unpublish
				</button>
			) : (
				<button type="button" onClick={handlePublish} disabled={loading || !sharedRoadmapId}>
					Publish to Community
				</button>
			)}
		</section>
	);
}
