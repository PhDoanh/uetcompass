import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import PublicSkillTreePage from './features/skill-tree/PublicSkillTreePage';
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
import { useEffect, useRef, useState } from 'react';

function normalizePathname(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}
	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function AppContent() {
	const { isAuthenticated, onboardingState, accessToken } = useAuth();
	const [isRoadmapSearchOverlayOpen, setIsRoadmapSearchOverlayOpen] = useState(false);
	const roadmapSearchPanelRef = useRef(null);
	const pathname = normalizePathname(typeof window !== 'undefined' ? window.location.pathname : '');
	const publicSkillTreeMatch = pathname.match(/^\/skill-tree\/([^/]+)$/);
	const publicSkillTreeRoadmapId = publicSkillTreeMatch ? decodeURIComponent(publicSkillTreeMatch[1]) : '';
	const isAuthPopupPath = ['/login', '/register', '/forgot-password'].includes(pathname);
	const isPublicPath =
		['/', '/login', '/register', '/forgot-password', '/sample-roadmap', '/roadmaps/search'].includes(pathname) ||
		Boolean(publicSkillTreeRoadmapId) ||
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

	useEffect(() => {
		if (typeof window === 'undefined' || !isRoadmapSearchOverlayOpen) {
			return undefined;
		}

		const isOutsideOverlayPanel = (target) => {
			const panel = roadmapSearchPanelRef.current;
			if (!panel || !(target instanceof Node)) {
				return false;
			}

			if (typeof target.composedPath === 'function') {
				return !target.composedPath().includes(panel);
			}

			return !panel.contains(target);
		};

		const handleOutsideInteraction = (event) => {
			if (isOutsideOverlayPanel(event.target)) {
				setIsRoadmapSearchOverlayOpen(false);
			}
		};

		const handleOutsideWheel = (event) => {
			if (isOutsideOverlayPanel(event.target)) {
				event.preventDefault();
				setIsRoadmapSearchOverlayOpen(false);
			}
		};

		document.addEventListener('mousedown', handleOutsideInteraction, true);
		document.addEventListener('touchstart', handleOutsideInteraction, true);
		document.addEventListener('click', handleOutsideInteraction, true);
		window.addEventListener('wheel', handleOutsideWheel, { capture: true, passive: false });
		window.addEventListener('touchmove', handleOutsideWheel, { capture: true, passive: false });

		return () => {
			document.removeEventListener('mousedown', handleOutsideInteraction, true);
			document.removeEventListener('touchstart', handleOutsideInteraction, true);
			document.removeEventListener('click', handleOutsideInteraction, true);
			window.removeEventListener('wheel', handleOutsideWheel, true);
			window.removeEventListener('touchmove', handleOutsideWheel, true);
		};
	}, [isRoadmapSearchOverlayOpen]);

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

	if (!content && publicSkillTreeRoadmapId) {
		content = (
			<main style={{ width: '100%', minHeight: 'calc(100vh - 70px)' }}>
				<PublicSkillTreePage roadmapId={publicSkillTreeRoadmapId} />
			</main>
		);
	}

	// Route to Skill Tree for personalized roadmap
	if (!content && pathname === '/skill-tree') {
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
						<div
							ref={roadmapSearchPanelRef}
							className="roadmap-search-overlay__panel"
							onClick={(event) => event.stopPropagation()}
						>
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