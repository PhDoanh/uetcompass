import OnboardingPanel from './features/onboarding/OnboardingPanel';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import AccountSettingsPage from './features/auth/AccountSettingsPage';
import OnboardingGuard from './guards/OnboardingGuard';
import AuthGuard from './guards/AuthGuard';
import { AuthProvider, useAuth } from './providers/AuthProvider';

function AppContent() {
	const { accessToken, onboardingState } = useAuth();
	const authToken = accessToken || '';
	const sseToken = accessToken || '';
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

	const handleUnauthorized = () => {
		if (typeof window !== 'undefined') {
			window.location.assign('/login');
		}
	};

	// Route to Skill Tree if pathname includes /skill-tree
	if (pathname.includes('/skill-tree')) {
		return (
			<OnboardingGuard>
				<main style={{ maxWidth: 1400, margin: '0 auto', height: '100vh' }}>
					<SkillTreePage />
				</main>
			</OnboardingGuard>
		);
	}

	if (pathname.includes('/settings')) {
		return (
			<OnboardingGuard>
				<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
					<AccountSettingsPage />
				</main>
			</OnboardingGuard>
		);
	}

	return (
		<OnboardingGuard>
			<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
				{onboardingState !== 'COMPLETED' ? (
					<OnboardingPanel authToken={authToken} sseToken={sseToken} onUnauthorized={handleUnauthorized} />
				) : null}
			</main>
		</OnboardingGuard>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<AuthGuard>
				<AppContent />
			</AuthGuard>
		</AuthProvider>
	);
}
