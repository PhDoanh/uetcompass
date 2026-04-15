import { decidePostLoginRoute, useAuth } from '../providers/AuthProvider';

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
    if (typeof window !== 'undefined') {
      window.location.replace('/');
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
