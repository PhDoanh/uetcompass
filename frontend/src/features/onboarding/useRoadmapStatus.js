import { useCallback, useEffect, useRef, useState } from 'react';
import { openStatusStream } from '../../services/onboarding.api';
import { retryRoadmapGeneration } from '../../services/roadmap.api';

export function useRoadmapStatus({ authToken, sseToken, onUnauthorized } = {}) {
	const sourceRef = useRef(null);
	const [status, setStatus] = useState('idle');
	const [error, setError] = useState(null);

	const close = useCallback(() => {
		if (sourceRef.current) {
			sourceRef.current.close();
			sourceRef.current = null;
		}
	}, []);

	const open = useCallback(() => {
		if (!sseToken) {
			return;
		}

		close();
		const source = openStatusStream(sseToken);
		sourceRef.current = source;
		setStatus('listening');

		source.addEventListener('roadmap:status', (event) => {
			const payload = JSON.parse(event.data);
			if (payload.status === 'completed') {
				setStatus('completed');
			}
			if (payload.status === 'failed') {
				setStatus('failed');
			}
		});

		source.addEventListener('error', (event) => {
			try {
				const payload = JSON.parse(event.data);
				if (payload.code === 'UNAUTHORIZED' && onUnauthorized) {
					onUnauthorized();
				}
			} catch (err) {
				setError(err);
			}
		});

		source.onerror = () => {
			setStatus((current) => (current === 'completed' ? current : 'reconnecting'));
		};
	}, [close, onUnauthorized, sseToken]);

	const retry = useCallback(async () => {
		if (!authToken) {
			return;
		}

		try {
			await retryRoadmapGeneration(authToken);
			setStatus('retrying');
			open();
		} catch (err) {
			if (err?.status === 401 && onUnauthorized) {
				onUnauthorized();
			}
			setError(err);
			throw err;
		}
	}, [authToken, onUnauthorized, open]);

	useEffect(() => () => close(), [close]);

	return {
		status,
		error,
		open,
		close,
		retry,
	};
}
