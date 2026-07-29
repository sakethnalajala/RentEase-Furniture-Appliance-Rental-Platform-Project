// Marks that THIS browser tab has an actively, explicitly established session — backed by
// sessionStorage specifically because it is per-tab: it survives a reload of this same tab
// (whether user-initiated or an internal Next.js client-router fallback reload) but does NOT
// carry over to a genuinely separate new tab (typed URL, bookmark, new window), unlike a
// session cookie, which is shared by every tab in the browser profile and so can't tell those
// two cases apart. See StoreProvider.js's SessionBootstrapper for how this is used.
const ACTIVE_SESSION_KEY = 'rentease_active_session';

export function markActiveSession() {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(ACTIVE_SESSION_KEY, '1');
}

export function hasActiveSessionFlag() {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(ACTIVE_SESSION_KEY) === '1';
}

export function clearActiveSessionFlag() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
}
