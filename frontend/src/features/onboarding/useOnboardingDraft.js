import { useCallback, useEffect, useRef, useState } from 'react';
import { getDraft, putDraft } from '../../services/onboarding.api';

export function useOnboardingDraft({ authToken, onUnauthorized, enabled = true } = {}) {
	const timerRef = useRef(null);
	const onUnauthorizedRef = useRef(onUnauthorized);
	const [draft, setDraft] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		onUnauthorizedRef.current = onUnauthorized;
	}, [onUnauthorized]);

	const handleError = useCallback((error) => {
		if (error?.status === 401 && typeof onUnauthorizedRef.current === 'function') {
			onUnauthorizedRef.current();
		}
		throw error;
	}, []);

	const loadDraft = useCallback(async () => {
		if (!enabled) {
			setLoading(false);
			return null;
		}

		if (!authToken) {
			setLoading(false);
			return null;
		}

		setLoading(true);
		try {
			const payload = await getDraft(authToken);
			setDraft(payload);
			return payload;
		} catch (error) {
			return handleError(error);
		} finally {
			setLoading(false);
		}
	}, [authToken, enabled, handleError]);

	const scheduleSave = useCallback(
		(payload) => {
			if (!enabled) {
				return;
			}

			if (!authToken) {
				return;
			}

			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(async () => {
				setSaving(true);
				try {
					const next = await putDraft(authToken, payload);
					setDraft(next);
				} catch (error) {
					handleError(error);
				} finally {
					setSaving(false);
				}
			}, 800);
		},
		[authToken, enabled, handleError]
	);

	useEffect(() => {
		loadDraft();
		return () => clearTimeout(timerRef.current);
	}, [loadDraft]);

	return {
		draft,
		loading,
		saving,
		loadDraft,
		scheduleSave,
	};
}
