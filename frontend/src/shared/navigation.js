export const NAVIGATION_START_EVENT = 'uet:navigation-start';
export const NAVIGATION_END_EVENT = 'uet:navigation-end';
export const LOCATION_CHANGE_EVENT = 'uet:location-change';

function isPlainLeftClick(event) {
	return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function normalizePathname(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}
	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function toRouteKey(locationLike) {
	const pathname = normalizePathname(locationLike?.pathname || '/');
	const search = String(locationLike?.search || '');
	return `${pathname}${search}`;
}

function toSameOriginUrl(path) {
	try {
		return new URL(path, window.location.origin);
	} catch {
		return null;
	}
}

export function navigateTo(path, options = {}) {
	if (typeof window === 'undefined') {
		return false;
	}

	const nextUrl = toSameOriginUrl(path);
	if (!nextUrl) {
		return false;
	}

	if (nextUrl.origin !== window.location.origin) {
		window.location.assign(nextUrl.href);
		return false;
	}

	const currentRoute = toRouteKey(window.location);
	const nextRoute = toRouteKey(nextUrl);
	const nextFullPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

	if (!options.force && currentRoute === nextRoute) {
		if (nextUrl.hash && nextUrl.hash !== window.location.hash) {
			window.location.hash = nextUrl.hash;
		}
		return false;
	}

	window.dispatchEvent(
		new CustomEvent(NAVIGATION_START_EVENT, {
			detail: {
				from: currentRoute,
				to: nextRoute,
				replace: Boolean(options.replace),
			},
		})
	);

	const method = options.replace ? 'replaceState' : 'pushState';
	window.history[method](options.state || {}, '', nextFullPath);
	window.dispatchEvent(new CustomEvent(LOCATION_CHANGE_EVENT, { detail: { path: nextRoute } }));

	return true;
}

export function interceptAnchorNavigation(event) {
	if (typeof window === 'undefined' || event.defaultPrevented || !isPlainLeftClick(event)) {
		return;
	}

	const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
	if (!anchor) {
		return;
	}

	const href = String(anchor.getAttribute('href') || '').trim();
	if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
		return;
	}

	if (anchor.hasAttribute('download')) {
		return;
	}

	if (anchor.target && anchor.target !== '_self') {
		return;
	}

	const nextUrl = toSameOriginUrl(href);
	if (!nextUrl || nextUrl.origin !== window.location.origin) {
		return;
	}

	event.preventDefault();
	navigateTo(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}
