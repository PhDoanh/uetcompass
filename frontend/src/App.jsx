import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import AccountSettingsPage from './features/auth/AccountSettingsPage';
import Homepage from './features/general/Homepage';
import NavBar from './features/general/NavBar';
import OnboardingGuard from './guards/OnboardingGuard';
import AuthGuard from './guards/AuthGuard';
import { AuthProvider, useAuth } from './providers/AuthProvider';

function normalizePathname(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}
	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function AppContent() {
	const { isAuthenticated } = useAuth();
	const pathname = normalizePathname(typeof window !== 'undefined' ? window.location.pathname : '');
	const isPublicPath = ['/login', '/register', '/forgot-password'].includes(pathname);

	if (pathname === '/login') {
		return <LoginPage />;
	}

	if (pathname === '/register') {
		return <RegisterPage />;
	}

	if (pathname === '/forgot-password') {
		return <ForgotPasswordPage />;
	}

	if (!isAuthenticated && !isPublicPath) {
		if (typeof window !== 'undefined') {
			window.location.replace('/login');
		}
		return null;
	}

	let content = null;

	if (pathname === '/') {
		content = <Homepage />;
	}

	// Route to Skill Tree if pathname includes /skill-tree
	if (!content && pathname.includes('/skill-tree')) {
		content = (
			<OnboardingGuard>
				<main style={{ width: '100%', minHeight: 'calc(100vh - 70px)' }}>
					<SkillTreePage />
				</main>
			</OnboardingGuard>
		);
	}

	const settingsPaths = ['/settings', '/account-settings', '/profile/settings'];
	if (!content && settingsPaths.includes(pathname)) {
		content = (
			<AuthGuard>
				<main>
					<AccountSettingsPage />
				</main>
			</AuthGuard>
		);
	}

	if (content) {
		return (
			<>
				<NavBar />
				{content}
			</>
		);
	}

	if (typeof window !== 'undefined') {
		window.location.replace(isAuthenticated ? '/' : '/login');
	}

	return null;
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

export default function App() {
	return (
		<AppContent />
	);
}