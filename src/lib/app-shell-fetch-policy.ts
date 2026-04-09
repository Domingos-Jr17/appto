export function isWorkspaceRoute(pathname?: string | null) {
  return Boolean(pathname && /^\/app\/trabalhos\/[^/]+/.test(pathname));
}

export function shouldPauseNonCriticalAppFetch(pathname?: string | null) {
  return isWorkspaceRoute(pathname);
}
