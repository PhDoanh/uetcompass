import React from 'react';

function prefersReducedMotion() {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function PageTransition({ routeKey, children }) {
	const reducedMotion = prefersReducedMotion();

	return (
		<div
			key={routeKey}
			className={`page-transition${reducedMotion ? ' page-transition--reduced' : ''}`}
			data-route-key={routeKey}
		>
			{children}
		</div>
	);
}
