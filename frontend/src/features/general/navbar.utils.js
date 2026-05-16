export function getRoadmapSearchTarget(pathname) {
  const blockedPaths = ['/login', '/register', '/forgot-password'];
  return !blockedPaths.includes(pathname);
}
