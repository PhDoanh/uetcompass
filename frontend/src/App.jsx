import OnboardingPanel from './features/onboarding/OnboardingPanel';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import AccountSettingsPage from './features/auth/AccountSettingsPage';
import OnboardingGuard from './guards/OnboardingGuard';
import AuthGuard from './guards/AuthGuard';
import { AuthProvider, useAuth } from './providers/AuthProvider';

function normalizePathname(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}
	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function HomePage({ onLogout }) {
	return (
		<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
			<h1 style={{ marginTop: 0 }}>UETCompass</h1>
			<p>Welcome back. You can explore features while onboarding is still in progress.</p>
			<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
				<a href="/skill-tree">Go to Skill Tree</a>
				<a href="/settings">Open Account Settings</a>
				<button type="button" onClick={onLogout}>Logout</button>
			</div>
		</main>
	);
}

function AppContent() {
	const { logoutAndRedirect } = useAuth();
	const pathname = normalizePathname(typeof window !== 'undefined' ? window.location.pathname : '');

	if (pathname === '/login') {
		return <LoginPage />;
	}

	if (pathname === '/register') {
		return <RegisterPage />;
	}

	if (pathname === '/forgot-password') {
		return <ForgotPasswordPage />;
	}

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

	const settingsPaths = ['/settings', '/account-settings', '/profile/settings'];
	if (settingsPaths.includes(pathname)) {
		return (
			<main>
				<AccountSettingsPage />
			</main>
		);
	}

	return <HomePage onLogout={logoutAndRedirect} />;
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
