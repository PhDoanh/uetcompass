import { decidePostLoginRoute, useAuth } from '../providers/AuthProvider';
import { navigateTo } from '../shared/navigation';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export default function AuthGuard({ children }) {
  const { isAuthenticated, onboardingState } = useAuth();
  const pathname = normalizePathname(typeof window !== 'undefined' ? window.location.pathname : '/');
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isAuthenticated && !isPublicPath) {
    navigateTo('/', { replace: true });
    return null;
  }

  if (isAuthenticated && isPublicPath) {
    navigateTo(decidePostLoginRoute(onboardingState), { replace: true });
    return null;
  }

  return children;
}
