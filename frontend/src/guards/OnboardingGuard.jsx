import { useAuth } from '../providers/AuthProvider';

export default function OnboardingGuard({ children }) {
	const { onboardingState } = useAuth();
	const onboardingCompleted = onboardingState === 'COMPLETED';
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

	// Redirect to / if accessing /skill-tree without completed onboarding
	if (!onboardingCompleted && pathname.includes('/skill-tree')) {
		if (typeof window !== 'undefined') {
			window.location.replace('/');
		}
		return null;
	}

	if (onboardingCompleted && typeof window !== 'undefined' && window.location.pathname.includes('/onboarding')) {
		window.location.replace('/');
		return null;
	}

	return children;
}
