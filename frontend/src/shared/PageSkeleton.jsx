import React from 'react';

export default function PageSkeleton({ label = 'Dang tai trang...' }) {
	return (
		<div className="page-skeleton" role="status" aria-live="polite" aria-label={label}>
			<div className="page-skeleton__header" />
			<div className="page-skeleton__hero" />
			<div className="page-skeleton__row" />
			<div className="page-skeleton__row page-skeleton__row--short" />
			<div className="page-skeleton__cards">
				<span className="page-skeleton__card" />
				<span className="page-skeleton__card" />
				<span className="page-skeleton__card" />
			</div>
		</div>
	);
}
