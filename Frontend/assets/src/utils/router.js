const DEFAULT_ROUTE = '/signup';

export const normalizePath = (path = '') => {
  if (typeof path !== 'string' || !path.trim()) {
    return DEFAULT_ROUTE;
  }

  const trimmed = path.trim();
  if (trimmed === '/') {
    return DEFAULT_ROUTE;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const getRouteFromPathname = (pathname = typeof window !== 'undefined' ? window.location.pathname : '/') => {
  const normalized = normalizePath(pathname);

  if (normalized === '/signin') return 'signin';
  if (normalized === '/forget-password') return 'forget-password';
  if (normalized === '/home') return 'home';
  if (normalized === '/cart') return 'cart';
  if (normalized === '/checkout') return 'checkout';
  if (normalized === '/orders') return 'orders';

  return 'signup';
};

export const navigateTo = (path) => {
  if (typeof window === 'undefined') return null;

  const normalized = normalizePath(path);
  window.history.pushState({}, '', normalized);
  window.dispatchEvent(new Event('routechange'));
  return normalized;
};
