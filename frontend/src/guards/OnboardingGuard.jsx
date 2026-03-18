export default function OnboardingGuard({ children }) {
	const onboardingCompleted =
		typeof window !== 'undefined' && window.localStorage.getItem('onboardingCompleted') === 'true';

	if (onboardingCompleted && typeof window !== 'undefined' && window.location.pathname.includes('/onboarding')) {
		window.location.replace('/');
		return null;
	}

	return children;
}
