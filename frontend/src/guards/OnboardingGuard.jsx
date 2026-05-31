import { useEffect, useMemo, useState } from 'react';
import authApi from '../services/auth.api';
import { useAuth } from '../providers/AuthProvider';
import { navigateTo } from '../shared/navigation';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';

function isInvalidSessionError(error) {
	return error?.status === 401 || (error?.status === 403 && error?.code === 'FORBIDDEN');
}

export default function OnboardingGuard({ children }) {
	const { accessToken, onboardingState, updateAuthInfo, logoutAndRedirect } = useAuth();
	const [resolvedCompleted, setResolvedCompleted] = useState(onboardingState === 'COMPLETED');
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
	const isOnboardingProtectedPath = useMemo(
		() => pathname.includes('/skill-tree') || pathname.includes('/learning-profile'),
		[pathname]
	);
	const onboardingCompleted = onboardingState === 'COMPLETED' || resolvedCompleted;

	useEffect(() => {
		if (!isOnboardingProtectedPath) {
			setResolvedCompleted(true);
			return;
		}

		if (onboardingState === 'COMPLETED') {
			setResolvedCompleted(true);
			return;
		}

		let isMounted = true;

		const resolveFromProfile = async () => {
			if (!accessToken) {
				navigateTo('/', { replace: true });
				return;
			}

			try {
				const profile = await authApi.getProfile(accessToken);
				const resolvedState = profile?.onboardingState;
				const hasMajorFallback = Boolean(String(profile?.profile?.major || '').trim());
				const isCompleted = resolvedState
					? resolvedState === 'COMPLETED'
					: hasMajorFallback;

				if (!isMounted) {
					return;
				}

				if (isCompleted) {
					setResolvedCompleted(true);
					updateAuthInfo?.({ onboardingState: 'COMPLETED' });
					return;
				}

				if (resolvedState && resolvedState !== onboardingState) {
					updateAuthInfo?.({ onboardingState: resolvedState });
				}

				window.sessionStorage.setItem(
					ONBOARDING_REDIRECT_NOTICE_KEY,
					'Cần hoàn thành Onboarding để vào tính năng này'
				);
				navigateTo('/', { replace: true });
			} catch (error) {
				if (!isMounted) {
					return;
				}

				if (isInvalidSessionError(error)) {
					logoutAndRedirect?.();
					return;
				}

				window.sessionStorage.setItem(
					ONBOARDING_REDIRECT_NOTICE_KEY,
					'Cần hoàn thành Onboarding để vào tính năng này'
				);
				navigateTo('/', { replace: true });
			}
		};

		resolveFromProfile();

		return () => {
			isMounted = false;
		};
	}, [accessToken, isOnboardingProtectedPath, logoutAndRedirect, onboardingState, updateAuthInfo]);

	if (isOnboardingProtectedPath && !onboardingCompleted) {
		return null;
	}

	return children;
}
