import { useEffect, useMemo, useRef } from 'react';

function normalizePath(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}
	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function createRoutePrefetchers() {
	return [
		{ match: (path) => path === '/', load: () => import('../features/general/Homepage') },
		{ match: (path) => path === '/login', load: () => import('../features/auth/LoginPage') },
		{ match: (path) => path === '/register', load: () => import('../features/auth/RegisterPage') },
		{ match: (path) => path === '/forgot-password', load: () => import('../features/auth/ForgotPasswordPage') },
		{ match: (path) => path === '/manual-roadmap', load: () => import('../features/manual-roadmap/ManualRoadmapPage') },
		{ match: (path) => path === '/skill-tree', load: () => import('../features/skill-tree/SkillTreePage') },
		{
			match: (path) => /^\/skill-tree\/.+/.test(path),
			load: () => import('../features/skill-tree/PublicSkillTreePage'),
		},
		{
			match: (path) => ['/settings', '/account-settings', '/profile/settings'].includes(path),
			load: () => import('../features/account/AccountSettingsPage'),
		},
		{
			match: (path) => path === '/onboarding' || path === '/on-boarding',
			load: () => import('../features/onboarding/OnboardingPanel'),
		},
		{ match: (path) => path === '/learning-profile', load: () => import('../features/onboarding/LearningProfilePage') },
		{ match: (path) => path === '/public-profile', load: () => import('../features/public-profile/PublicProfilePage') },
		{ match: (path) => path.startsWith('/roadmaps/public/'), load: () => import('../features/skill-tree/PublicSkillTreePage') },
	];
}

function prefetchByPath(pathname, prefetchers, cache) {
	const path = normalizePath(pathname);
	const candidate = prefetchers.find((item) => item.match(path));
	if (!candidate || cache.has(path)) {
		return;
	}

	cache.add(path);
	candidate.load().catch(() => {
		cache.delete(path);
	});
}

export default function usePrefetch() {
	const prefetchedPathsRef = useRef(new Set());
	const prefetchers = useMemo(() => createRoutePrefetchers(), []);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return undefined;
		}

		const schedulePrefetch = (event) => {
			const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
			if (!anchor) {
				return;
			}

			const href = String(anchor.getAttribute('href') || '').trim();
			if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
				return;
			}

			let url;
			try {
				url = new URL(href, window.location.origin);
			} catch (_) {
				return;
			}

			if (url.origin !== window.location.origin) {
				return;
			}

			prefetchByPath(url.pathname, prefetchers, prefetchedPathsRef.current);
		};

		window.addEventListener('mouseover', schedulePrefetch, true);
		window.addEventListener('focusin', schedulePrefetch, true);

		return () => {
			window.removeEventListener('mouseover', schedulePrefetch, true);
			window.removeEventListener('focusin', schedulePrefetch, true);
		};
	}, [prefetchers]);
}
