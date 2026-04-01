import OnboardingPanel from './features/onboarding/OnboardingPanel';
import OnboardingGuard from './guards/OnboardingGuard';

function AppContent() {
	const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
	const sseToken = typeof window !== 'undefined' ? window.localStorage.getItem('sseToken') || '' : '';

	const handleUnauthorized = () => {
		if (typeof window !== 'undefined') {
			window.location.assign('/login');
		}
	};

	return (
		<OnboardingGuard>
			<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
				<OnboardingPanel authToken={authToken} sseToken={sseToken} onUnauthorized={handleUnauthorized} />
			</main>
		</OnboardingGuard>
	);
}

export default function App() {
	return (
		<AppContent />
	);
}