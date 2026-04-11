import { useEffect, useMemo, useState } from 'react';
import authApi from '../services/auth.api';
import { useAuth } from '../providers/AuthProvider';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';

export default function OnboardingGuard({ children }) {
	const { accessToken, onboardingState, updateAuthInfo, logoutAndRedirect } = useAuth();
	const [resolvedCompleted, setResolvedCompleted] = useState(onboardingState === 'COMPLETED');
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
	const isSkillTreePath = useMemo(() => pathname.includes('/skill-tree'), [pathname]);
	const onboardingCompleted = onboardingState === 'COMPLETED' || resolvedCompleted;

	useEffect(() => {
		if (!isSkillTreePath) {
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
				if (typeof window !== 'undefined') {
					window.location.replace('/login');
				}
				return;
			}

			try {
				const profile = await authApi.getProfile(accessToken);
				const hasMajor = Boolean(String(profile?.profile?.major || '').trim());

				if (!isMounted) {
					return;
				}

				if (hasMajor) {
					setResolvedCompleted(true);
					updateAuthInfo?.({ onboardingState: 'COMPLETED' });
					return;
				}

				window.sessionStorage.setItem(
					ONBOARDING_REDIRECT_NOTICE_KEY,
					'Cần hoàn thành Onboarding để vào tính năng này'
				);
				window.location.replace('/');
			} catch (error) {
				if (!isMounted) {
					return;
				}

				if (error?.status === 401) {
					logoutAndRedirect?.();
					return;
				}

				window.sessionStorage.setItem(
					ONBOARDING_REDIRECT_NOTICE_KEY,
					'Cần hoàn thành Onboarding để vào tính năng này'
				);
				window.location.replace('/');
			}
		};

		resolveFromProfile();

		return () => {
			isMounted = false;
		};
	}, [accessToken, isSkillTreePath, logoutAndRedirect, onboardingState, updateAuthInfo]);

	if (isSkillTreePath && !onboardingCompleted) {
		return null;
	}

	return children;
}