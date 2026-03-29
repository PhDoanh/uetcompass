import OnboardingPanel from './features/onboarding/OnboardingPanel';
import SkillTreePage from './features/skill-tree/SkillTreePage';
import SearchPage from './features/search/SearchPage';
import OnboardingGuard from './guards/OnboardingGuard';

export default function App() {
	const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
	const sseToken = typeof window !== 'undefined' ? window.localStorage.getItem('sseToken') || '' : '';
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

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

	// Route to Search if pathname includes /search
	if (pathname.includes('/search')) {
		return (
			<OnboardingGuard>
				<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
					<SearchPage />
				</main>
			</OnboardingGuard>
		);
	}

	return (
		<OnboardingGuard>
			<main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
				<div style={{ marginBottom: 12 }}>
					<a href="/search" style={{ marginRight: 12 }}>Search</a>
					<a href="/skill-tree">Skill Tree</a>
				</div>
				<OnboardingPanel authToken={authToken} sseToken={sseToken} onUnauthorized={handleUnauthorized} />
			</main>
		</OnboardingGuard>
	);
}
