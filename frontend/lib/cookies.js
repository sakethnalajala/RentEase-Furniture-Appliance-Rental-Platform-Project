// A plain (non-httpOnly) same-origin cookie the Next.js middleware can read to decide
// whether to redirect for role-gated routes. It is NOT a security boundary — the real
// refresh token is a separate httpOnly cookie on the API domain, and every API request
// is still authorized server-side via JWT + RBAC regardless of this cookie's value.
const ROLE_COOKIE = 'rentease_role';

// `rememberMe` mirrors the backend refresh-token cookie's own persistence choice — without a
// `max-age`, a cookie is session-only (the browser drops it when it fully closes), which is
// what keeps a non-"remembered" login from surviving a real browser restart. Persisting this
// cookie (30 days) while the actual httpOnly refresh cookie was session-only would otherwise
// let middleware.js route a returning visitor straight into a dashboard shell that immediately
// fails to load any data once SessionBootstrapper's refresh call 401s.
export function setRoleCookie(role, rememberMe = false) {
  const maxAge = rememberMe ? `max-age=${30 * 24 * 60 * 60}; ` : '';
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; ${maxAge}SameSite=Lax`;
}

export function clearRoleCookie() {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}
