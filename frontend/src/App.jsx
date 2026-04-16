import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import AccountSettingsPage from './features/account/AccountSettingsPage';
import Homepage from './features/general/Homepage';
import OnboardingPanel from './features/onboarding/OnboardingPanel';
import LearningProfilePage from './features/onboarding/LearningProfilePage';
import ManualRoadmapPage from './features/manual-roadmap/ManualRoadmapPage';
import RoadmapSearchPage from './features/roadmap-search/RoadmapSearchPage';
import NavBar from './features/general/NavBar';
import { NotificationProvider } from './features/general/NotificationContainer';
import OnboardingGuard from './guards/OnboardingGuard';
import AuthGuard from './guards/AuthGuard';
import { AuthProvider, decidePostLoginRoute, useAuth } from './providers/AuthProvider';
import { useEffect, useState } from 'react';

function normalizePathname(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}
	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function AppContent() {
	const { isAuthenticated, onboardingState, accessToken } = useAuth();
	const [isRoadmapSearchOverlayOpen, setIsRoadmapSearchOverlayOpen] = useState(false);
	const pathname = normalizePathname(typeof window !== 'undefined' ? window.location.pathname : '');
	const isAuthPopupPath = ['/login', '/register', '/forgot-password'].includes(pathname);
	const isPublicPath =
		['/', '/login', '/register', '/forgot-password', '/sample-roadmap', '/roadmaps/search'].includes(pathname) ||
		pathname.startsWith('/roadmaps/public/');

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const handleOpenOverlay = () => {
			setIsRoadmapSearchOverlayOpen(true);
		};

		const handleCloseOverlay = () => {
			setIsRoadmapSearchOverlayOpen(false);
		};

		const handleEscClose = (event) => {
			if (event.key === 'Escape') {
				setIsRoadmapSearchOverlayOpen(false);
			}
		};

		window.addEventListener('roadmap-search-overlay-open', handleOpenOverlay);
		window.addEventListener('roadmap-search-overlay-close', handleCloseOverlay);
		window.addEventListener('keydown', handleEscClose);

		if (pathname === '/roadmaps/search') {
			setIsRoadmapSearchOverlayOpen(true);
		}

		return () => {
			window.removeEventListener('roadmap-search-overlay-open', handleOpenOverlay);
			window.removeEventListener('roadmap-search-overlay-close', handleCloseOverlay);
			window.removeEventListener('keydown', handleEscClose);
		};
	}, [pathname]);

	if (isAuthenticated && isAuthPopupPath) {
		if (typeof window !== 'undefined') {
			window.location.replace(decidePostLoginRoute(onboardingState));
		}
		return null;
	}

	if (!isAuthenticated && !isPublicPath) {
		if (typeof window !== 'undefined') {
			window.location.replace('/');
		}
		return null;
	}

	let content = null;

	if (pathname === '/') {
		content = <Homepage />;
	}

	if (!content && (pathname === '/onboarding' || pathname === '/on-boarding')) {
		content = (
			<AuthGuard>
				<main style={{ width: '100%', minHeight: 'calc(100vh - 70px)' }}>
					<OnboardingPanel
						authToken={accessToken}
						sseToken={accessToken}
						onClose={() => {
							if (typeof window !== 'undefined') {
								window.location.assign('/');
							}
						}}
						onCompleted={() => {
							if (typeof window !== 'undefined') {
								window.location.assign('/skill-tree');
							}
						}}
						isFullPage
						showDismissButton={false}
					/>
				</main>
			</AuthGuard>
		);
	}

	// Route to sample roadmap
	if (!content && pathname === '/sample-roadmap') {
		content = (
			<main style={{ width: '100%', minHeight: 'calc(100vh - 70px)' }}>
				<div style={{ padding: '24px' }}>
					<h1>Sample Roadmap</h1>
					<p>This is a sample roadmap showing typical course progression.</p>
					<p>To create your personalized roadmap, please log in or register.</p>
				</div>
			</main>
		);
	}

	if (!content && pathname === '/manual-roadmap') {
		content = (
			<AuthGuard>
				<main style={{ width: '100%', minHeight: 'calc(100vh - 70px)' }}>
					<ManualRoadmapPage />
				</main>
			</AuthGuard>
		);
	}

	if (!content && pathname === '/roadmaps/search') {
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

	if (!content && pathname === '/learning-profile') {
		content = (
			<AuthGuard>
				<OnboardingGuard>
					<LearningProfilePage />
				</OnboardingGuard>
			</AuthGuard>
		);
	}

	if (!content && isAuthPopupPath) {
		content = <Homepage />;
	}

	if (content) {
		const authPopupContent = pathname === '/login'
			? <LoginPage />
			: pathname === '/register'
				? <RegisterPage />
				: pathname === '/forgot-password'
					? <ForgotPasswordPage />
					: null;

		return (
			<NotificationProvider sseToken={isAuthenticated ? (accessToken || '') : ''}>
				<NavBar />
				{content}
				{isAuthPopupPath ? (
					<div
						className="auth-modal-overlay"
						role="dialog"
						aria-modal="true"
					>
						<div className="auth-modal-shell">
							<button
								type="button"
								className="auth-modal-close"
								onClick={() => {
									if (typeof window !== 'undefined') {
										window.location.assign('/');
									}
								}}
								aria-label="Close authentication popup"
							>
								x
							</button>
							{authPopupContent}
						</div>
					</div>
				) : null}
				{isRoadmapSearchOverlayOpen ? (
					<div
						className="roadmap-search-overlay"
						role="dialog"
						aria-modal="true"
						onClick={() => setIsRoadmapSearchOverlayOpen(false)}
					>
						<div className="roadmap-search-overlay__backdrop" />
						<div className="roadmap-search-overlay__panel" onClick={(event) => event.stopPropagation()}>
							<div className="roadmap-search-overlay__header">
								<h2 className="roadmap-search-overlay__title">Roadmap Search</h2>
								<button
									type="button"
									className="roadmap-search-overlay__close"
									onClick={() => setIsRoadmapSearchOverlayOpen(false)}
									aria-label="Close roadmap search"
								>
									x
								</button>
							</div>
							<RoadmapSearchPage />
						</div>
					</div>
				) : null}
			</NotificationProvider>
		);
	}

	if (typeof window !== 'undefined') {
		window.location.replace('/');
	}

	return null;
}

export default function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	);
}