import { useAuth } from '../providers/AuthProvider';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';

export default function OnboardingGuard({ children }) {
	const { onboardingState } = useAuth();
	const onboardingCompleted = onboardingState === 'COMPLETED';
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

	// Redirect to / if accessing /skill-tree without completed onboarding
	if (!onboardingCompleted && pathname.includes('/skill-tree')) {
		if (typeof window !== 'undefined') {
			window.sessionStorage.setItem(
				ONBOARDING_REDIRECT_NOTICE_KEY,
				'Cần hoàn thành Onboarding để vào tính năng này'
			);
			window.location.replace('/');
		}
		return null;
	}

	return children;
}
