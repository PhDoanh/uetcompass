export default function OnboardingGuard({ children }) {
	const onboardingCompleted =
		typeof window !== 'undefined' && window.localStorage.getItem('onboardingCompleted') === 'true';
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

	// Redirect to / if accessing /skill-tree without completed onboarding
	if (!onboardingCompleted && pathname.includes('/skill-tree')) {
		if (typeof window !== 'undefined') {
			window.location.replace('/');
		}
		return null;
	}

	return children;
}
