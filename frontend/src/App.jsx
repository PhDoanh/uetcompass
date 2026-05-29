import { lazy, startTransition, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import NavBar from './features/general/NavBar';
import { NotificationProvider } from './features/notification/NotificationContainer';
import OnboardingGuard from './guards/OnboardingGuard';
import AuthGuard from './guards/AuthGuard';
import { AuthProvider, decidePostLoginRoute, useAuth } from './providers/AuthProvider';
import usePrefetch from './hooks/usePrefetch';
import NavigationProgressBar from './shared/NavigationProgressBar';
import PageSkeleton from './shared/PageSkeleton';
import PageTransition from './shared/PageTransition';
import ScrollRestorationManager from './shared/ScrollRestorationManager';
import {
	interceptAnchorNavigation,
	LOCATION_CHANGE_EVENT,
	navigateTo,
	NAVIGATION_END_EVENT,
	NAVIGATION_START_EVENT,
	normalizePathname,
	toRouteKey,
} from './shared/navigation';
import './style/navigation-orchestration.css';
import { X } from 'lucide-react';

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const SkillTreePage = lazy(() => import('./features/skill-tree/SkillTreePage'));
const PublicSkillTreePage = lazy(() => import('./features/skill-tree/PublicSkillTreePage'));
const AccountSettingsPage = lazy(() => import('./features/account/AccountSettingsPage'));
const Homepage = lazy(() => import('./features/general/Homepage'));
const OnboardingPanel = lazy(() => import('./features/onboarding/OnboardingPanel'));
const LearningProfilePage = lazy(() => import('./features/onboarding/LearningProfilePage'));
const PublicProfilePage = lazy(() => import('./features/public-profile/PublicProfilePage'));
const ManualRoadmapPage = lazy(() => import('./features/manual-roadmap/ManualRoadmapPage'));
const RoadmapSearchPage = lazy(() => import('./features/roadmap-search/RoadmapSearchPage'));
const ProgressDashboard = lazy(() => import('./features/progress/ProgressDashboard'));

function shouldUseReducedMotion() {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function RouteReadySignal({ routeKey }) {
	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		window.dispatchEvent(
			new CustomEvent(NAVIGATION_END_EVENT, {
				detail: {
					routeKey,
				},
			})
		);
	}, [routeKey]);

	return null;
}

function RouteFrame({ routeKey, children, fallbackLabel }) {
	return (
		<PageTransition routeKey={routeKey}>
			<Suspense fallback={<PageSkeleton label={fallbackLabel} />}>
				<RouteReadySignal routeKey={routeKey} />
				{children}
			</Suspense>
		</PageTransition>
	);
}

function AppContent() {
	const { isAuthenticated, onboardingState, accessToken } = useAuth();
	const [isRoadmapSearchOverlayOpen, setIsRoadmapSearchOverlayOpen] = useState(false);
	const [isRoadmapSearchOverlayExpanded, setIsRoadmapSearchOverlayExpanded] = useState(false);
	const [routeState, setRouteState] = useState(() => {
		if (typeof window === 'undefined') {
			return { pathname: '/', search: '' };
		}

		return {
			pathname: normalizePathname(window.location.pathname),
			search: String(window.location.search || ''),
		};
	});
	const roadmapSearchPanelRef = useRef(null);
	const routeKeyRef = useRef(toRouteKey(routeState));
	const pathname = routeState.pathname;
	const routeKey = toRouteKey(routeState);
	const publicSkillTreeMatch = pathname.match(/^\/skill-tree\/([^/]+)$/);
	const publicSkillTreeRoadmapId = publicSkillTreeMatch ? decodeURIComponent(publicSkillTreeMatch[1]) : '';
	const publicProfileMatch = pathname.match(/^\/public-profile\/([^/]+)$/);
	const publicProfileUserId = publicProfileMatch ? decodeURIComponent(publicProfileMatch[1]) : '';
	const isAuthPopupPath = ['/login', '/register', '/forgot-password'].includes(pathname);
	const isPublicPath =
		['/', '/login', '/register', '/forgot-password', '/sample-roadmap', '/system-improvement'].includes(pathname) ||
		Boolean(publicSkillTreeRoadmapId) ||
		Boolean(publicProfileUserId) ||
		pathname.startsWith('/roadmaps/public/');

	usePrefetch();

	const syncRouteState = useCallback(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const nextPathname = normalizePathname(window.location.pathname);
		const nextSearch = String(window.location.search || '');
		const nextRouteKey = toRouteKey({ pathname: nextPathname, search: nextSearch });

		if (nextRouteKey === routeKeyRef.current) {
			return;
		}

		const commit = () => {
			startTransition(() => {
				setRouteState({ pathname: nextPathname, search: nextSearch });
			});
		};

		if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function' && !shouldUseReducedMotion()) {
			document.startViewTransition(commit);
			return;
		}

		commit();
	}, []);

	useEffect(() => {
		routeKeyRef.current = routeKey;
	}, [routeKey]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return undefined;
		}

		const handlePopState = () => {
			const nextRouteKey = toRouteKey(window.location);
			if (nextRouteKey !== routeKeyRef.current) {
				window.dispatchEvent(
					new CustomEvent(NAVIGATION_START_EVENT, {
						detail: {
							from: routeKeyRef.current,
							to: nextRouteKey,
							replace: false,
						},
					})
				);
			}

			syncRouteState();
		};

		document.addEventListener('click', interceptAnchorNavigation, true);
		window.addEventListener('popstate', handlePopState);
		window.addEventListener(LOCATION_CHANGE_EVENT, syncRouteState);

		return () => {
			document.removeEventListener('click', interceptAnchorNavigation, true);
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener(LOCATION_CHANGE_EVENT, syncRouteState);
		};
	}, [syncRouteState]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const handleOpenOverlay = () => {
			setIsRoadmapSearchOverlayOpen(true);
		};

		const handleCloseOverlay = () => {
			setIsRoadmapSearchOverlayOpen(false);
			setIsRoadmapSearchOverlayExpanded(false);
		};

		const handleSearchContentChange = (event) => {
			setIsRoadmapSearchOverlayExpanded(Boolean(event?.detail?.hasSearchContent));
		};

		const handleEscClose = (event) => {
			if (event.key === 'Escape') {
				setIsRoadmapSearchOverlayOpen(false);
				setIsRoadmapSearchOverlayExpanded(false);
			}
		};

		window.addEventListener('roadmap-search-overlay-open', handleOpenOverlay);
		window.addEventListener('roadmap-search-overlay-close', handleCloseOverlay);
		window.addEventListener('roadmap-search-content-change', handleSearchContentChange);
		window.addEventListener('keydown', handleEscClose);

		return () => {
			window.removeEventListener('roadmap-search-overlay-open', handleOpenOverlay);
			window.removeEventListener('roadmap-search-overlay-close', handleCloseOverlay);
			window.removeEventListener('roadmap-search-content-change', handleSearchContentChange);
			window.removeEventListener('keydown', handleEscClose);
		};
	}, [pathname]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		window.dispatchEvent(
			new CustomEvent(isRoadmapSearchOverlayOpen ? 'roadmap-search-overlay-open' : 'roadmap-search-overlay-close')
		);
	}, [isRoadmapSearchOverlayOpen]);

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
				return;
			}

			if (event.ctrlKey || event.metaKey) {
				event.preventDefault();
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
		navigateTo(decidePostLoginRoute(onboardingState), { replace: true });
		return null;
	}

	if (!isAuthenticated && !isPublicPath) {
		navigateTo('/', { replace: true });
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
						onClose={() => navigateTo('/')}
						onCompleted={() => navigateTo('/skill-tree')}
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

	if (!content && pathname === '/progress') {
		content = (
			<AuthGuard>
				<OnboardingGuard>
					<main style={{ width: '100%', minHeight: 'calc(100vh - 70px)' }}>
						<ProgressDashboard />
					</main>
				</OnboardingGuard>
			</AuthGuard>
		);
	}

	if (!content && publicSkillTreeRoadmapId) {
		content = (
			<main style={{ width: '100%', height: '100vh' }}>
				<PublicSkillTreePage roadmapId={publicSkillTreeRoadmapId} />
			</main>
		);
	}

	// Route to Skill Tree for personalized roadmap
	if (!content && pathname === '/skill-tree') {
		content = (
			<OnboardingGuard>
				<main style={{ width: '100%', height: '100vh' }}>
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

	if (!content && publicProfileUserId) {
		content = <PublicProfilePage userId={publicProfileUserId} />;
	}

	if (!content && pathname === '/public-profile') {
		content = <PublicProfilePage />;
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
				<NavigationProgressBar />
				<ScrollRestorationManager routeKey={routeKey} />
				<NavBar />
				<RouteFrame routeKey={routeKey} fallbackLabel="Dang tai du lieu trang...">
					{content}
				</RouteFrame>
				{isAuthPopupPath ? (
					<div
						className="auth-modal-overlay"
						role="dialog"
						aria-modal="true"
						aria-label="Authentication popup"
					>
						<div className="auth-modal-shell">
							<button
								type="button"
								className="auth-modal-close"
								onClick={() => navigateTo('/')}
								aria-label="Close authentication popup"
							>
								<X size={16} aria-hidden="true" />
							</button>
							{authPopupContent}
						</div>
					</div>
				) : null}
				{isRoadmapSearchOverlayOpen ? (
					<div
						className="roadmap-search-overlay"
						id="roadmap-search-overlay"
						role="dialog"
						aria-modal="true"
						aria-label="Roadmap search overlay"
						onClick={() => setIsRoadmapSearchOverlayOpen(false)}
					>
						<div className="roadmap-search-overlay__backdrop" />
						<div
							className={`roadmap-search-overlay__page-mask${isRoadmapSearchOverlayExpanded ? ' roadmap-search-overlay__page-mask--expanded' : ' roadmap-search-overlay__page-mask--collapsed'}`}
						/>
						<div
							ref={roadmapSearchPanelRef}
							className={`roadmap-search-overlay__panel${isRoadmapSearchOverlayExpanded ? ' roadmap-search-overlay__panel--expanded' : ' roadmap-search-overlay__panel--collapsed'}`}
							onClick={(event) => event.stopPropagation()}
						>
							<div className={`roadmap-search-overlay__header${isRoadmapSearchOverlayExpanded ? ' roadmap-search-overlay__header--expanded' : ' roadmap-search-overlay__header--collapsed'}`}>
								<h2 className="roadmap-search-overlay__title">Roadmap Search</h2>
								<button
									type="button"
									className="roadmap-search-overlay__close"
									onClick={() => setIsRoadmapSearchOverlayOpen(false)}
									aria-label="Close roadmap search"
								>
									<X size={16} aria-hidden="true" />
								</button>
							</div>
							<Suspense fallback={<PageSkeleton label="Dang tai bo loc roadmap..." />}>
								<RoadmapSearchPage />
							</Suspense>
						</div>
					</div>
				) : null}
			</NotificationProvider>
		);
	}

	navigateTo('/', { replace: true });

	return null;
}

export default function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	);
}