import OnboardingPanel from './features/onboarding/OnboardingPanel';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import ShareControls from './features/roadmap-community/ShareControls';
import ShareSnapshotPage from './features/roadmap-community/ShareSnapshotPage';
import OnboardingGuard from './guards/OnboardingGuard';

export default function App() {
	const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
	const sseToken = typeof window !== 'undefined' ? window.localStorage.getItem('sseToken') || '' : '';
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
	const shareToken = pathname.startsWith('/share/') ? decodeURIComponent(pathname.replace('/share/', '')) : '';

	const handleUnauthorized = () => {
		if (typeof window !== 'undefined') {
			window.location.assign('/login');
		}
	};

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

	if (shareToken) {
		return <ShareSnapshotPage token={shareToken} />;
	}

	if (pathname.includes('/community/share')) {
		return (
			<OnboardingGuard>
				<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
					<ShareControls authToken={authToken} />
				</main>
			</OnboardingGuard>
		);
	}

	return (
		<OnboardingGuard>
			<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
				<OnboardingPanel authToken={authToken} sseToken={sseToken} onUnauthorized={handleUnauthorized} />
			</main>
		</OnboardingGuard>
	);
}
