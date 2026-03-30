import { decidePostLoginRoute, useAuth } from '../providers/AuthProvider';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export default function AuthGuard({ children }) {
  const { isAuthenticated, onboardingState } = useAuth();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isAuthenticated && !isPublicPath) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return null;
  }

  if (isAuthenticated && isPublicPath) {
    if (typeof window !== 'undefined') {
      window.location.replace(decidePostLoginRoute(onboardingState));
    }
    return null;
  }

  return children;
}
