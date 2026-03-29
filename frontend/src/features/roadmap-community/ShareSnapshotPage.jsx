import { useEffect, useState } from 'react';
import { getShareLinkSnapshot } from '../../services/roadmapCommunity.api';

export default function ShareSnapshotPage({ token }) {
	const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [snapshot, setSnapshot] = useState(null);

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		setError('');

		getShareLinkSnapshot(token, authToken || undefined)
			.then((data) => {
				if (!isMounted) return;
				setSnapshot(data);
			})
			.catch((err) => {
				if (!isMounted) return;
				setError(err?.message || 'Unable to load shared snapshot');
			})
			.finally(() => {
				if (!isMounted) return;
				setLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [token, authToken]);

	if (loading) {
		return <main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>Loading shared roadmap...</main>;
	}

	if (error) {
		return (
			<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
				<h1>Shared roadmap unavailable</h1>
				<p>{error}</p>
			</main>
		);
	}

	return (
		<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
			<h1>Shared Roadmap Snapshot</h1>
			<p>
				<strong>Owner:</strong> {snapshot?.owner?.displayName || 'Student'} ({snapshot?.owner?.major || 'Unknown major'})
			</p>
			<p>
				<strong>Nodes:</strong> {snapshot?.nodeCount || 0}
			</p>
			<ul>
				{(snapshot?.nodes || []).map((node) => (
					<li key={`${node.courseCode}-${node.reason}`} style={{ marginBottom: 10 }}>
						<div><strong>{node.courseCode}</strong> - {node.courseName}</div>
						<div>Skills: {(node.skills || []).join(', ') || 'N/A'}</div>
						<div>Reason: {node.reason}</div>
					</li>
				))}
			</ul>
		</main>
	);
}
