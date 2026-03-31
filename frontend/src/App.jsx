import OnboardingPanel from './features/onboarding/OnboardingPanel';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import AccountSettingsPage from './features/auth/AccountSettingsPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
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

	if (pathname.includes('/login')) {
		return <LoginPage />;
	}

	if (pathname.includes('/register')) {
		return <RegisterPage />;
	}

	if (pathname.includes('/forgot-password')) {
		return <ForgotPasswordPage />;
	}

	if (pathname.includes('/skill-tree')) {
		return (
			<AuthGuard>
				<OnboardingGuard>
					<main className="skill-tree-route-wrapper">
						<SkillTreePage />
					</main>
				</OnboardingGuard>
			</AuthGuard>
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
		<AuthGuard>
			<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
				{onboardingState !== 'COMPLETED' ? (
					<OnboardingPanel authToken={authToken} sseToken={sseToken} onUnauthorized={handleUnauthorized} />
				) : null}
			</main>
		</AuthGuard>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	);
}
