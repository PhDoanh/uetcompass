import { useEffect, useRef, useState } from 'react';
import { NAVIGATION_END_EVENT, NAVIGATION_START_EVENT } from './navigation';

export default function NavigationProgressBar() {
	const [isVisible, setIsVisible] = useState(false);
	const [progress, setProgress] = useState(0);
	const timerRef = useRef(null);
	const completeTimeoutRef = useRef(null);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return undefined;
		}

		const stopProgressTimer = () => {
			if (timerRef.current) {
				window.clearInterval(timerRef.current);
				timerRef.current = null;
			}
		};

		const clearCompleteTimeout = () => {
			if (completeTimeoutRef.current) {
				window.clearTimeout(completeTimeoutRef.current);
				completeTimeoutRef.current = null;
			}
		};

		const handleStart = () => {
			clearCompleteTimeout();
			setIsVisible(true);
			setProgress(16);
			stopProgressTimer();
			timerRef.current = window.setInterval(() => {
				setProgress((prev) => Math.min(88, prev + Math.max(1, (90 - prev) * 0.08)));
			}, 120);
		};

		const handleEnd = () => {
			stopProgressTimer();
			setProgress(100);
			clearCompleteTimeout();
			completeTimeoutRef.current = window.setTimeout(() => {
				setIsVisible(false);
				setProgress(0);
			}, 220);
		};

		window.addEventListener(NAVIGATION_START_EVENT, handleStart);
		window.addEventListener(NAVIGATION_END_EVENT, handleEnd);

		return () => {
			window.removeEventListener(NAVIGATION_START_EVENT, handleStart);
			window.removeEventListener(NAVIGATION_END_EVENT, handleEnd);
			stopProgressTimer();
			clearCompleteTimeout();
		};
	}, []);

	return (
		<div className={`navigation-progress${isVisible ? ' navigation-progress--visible' : ''}`} aria-hidden="true">
			<span className="navigation-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
		</div>
	);
}
