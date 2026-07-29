'use client';

import { useRef, useEffect } from 'react';
import { Provider, useDispatch, useStore } from 'react-redux';
import { makeStore } from './store';
import { authApi } from './authApi';
import { setAccessToken, setCredentials, setUnauthenticated } from './authSlice';
import { clearRoleCookie } from '@/lib/cookies';

// Module-level (not a component ref) so this can only ever fire once per real page load — a
// fresh script evaluation (new tab, hard reload) is the only thing that resets it. A ref-based
// guard resets on any component remount, and on Vercel's production hosting SessionBootstrapper
// has been observed to remount a few seconds after an explicit, interactive login (cause not
// fully isolated — not reproducible against a local `next start` build), which let this same
// "discard a non-remembered session" logic incorrectly fire a second time against a session the
// user had just actively, explicitly logged into, silently bouncing them back to /login a few
// seconds after signing in. Module scope closes that hole regardless of what triggers the remount.
let hasBootstrapped = false;

// Access tokens live only in memory (Redux), so a hard refresh loses them. On first mount we
// ask whether the httpOnly refresh cookie is still good — but only actually restore the
// session (populate Redux, land the user back in their dashboard) when that cookie was issued
// with "Remember me" checked. Every other login (every demo login, every Google login, and any
// manual login without the checkbox) is deliberately session-only: opening a fresh tab or
// reloading must land back on the public Home page and require an explicit login, even though
// the underlying refresh cookie is technically still valid for the rest of this browser
// session — per product direction, only an explicit "Remember me" should ever silently resume
// a session. The refresh call itself still happens (it's the only way to learn whether this
// was a remembered session), its result is just discarded rather than applied when it wasn't.
function SessionBootstrapper({ children }) {
  const dispatch = useDispatch();
  const store = useStore();

  useEffect(() => {
    if (hasBootstrapped) return;
    hasBootstrapped = true;

    (async () => {
      try {
        const refreshResult = await dispatch(authApi.endpoints.refresh.initiate()).unwrap();
        const accessToken = refreshResult?.data?.accessToken;
        if (!accessToken || !refreshResult?.data?.rememberMe) throw new Error('Not a remembered session');

        dispatch(setAccessToken(accessToken));
        const meResult = await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap();
        dispatch(setCredentials({ user: meResult.data, accessToken, rememberMe: true }));
      } catch (err) {
        // Defense in depth: if the user already interactively logged in (e.g. this check
        // resolved late, after a fast explicit login), never let this stale/duplicate check
        // downgrade that live session back to unauthenticated — only discard when we're still
        // genuinely pre-login.
        if (store.getState().auth.status === 'authenticated') return;
        dispatch(setUnauthenticated());
        if (typeof window !== 'undefined') clearRoleCookie();
      }
    })();
  }, [dispatch, store]);

  return children;
}

export default function StoreProvider({ children }) {
  const storeRef = useRef();
  if (!storeRef.current) storeRef.current = makeStore();

  return (
    <Provider store={storeRef.current}>
      <SessionBootstrapper>{children}</SessionBootstrapper>
    </Provider>
  );
}
