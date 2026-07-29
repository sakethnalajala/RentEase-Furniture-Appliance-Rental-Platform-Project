'use client';

import { useRef, useEffect } from 'react';
import { Provider, useDispatch, useStore } from 'react-redux';
import { makeStore } from './store';
import { authApi } from './authApi';
import { setAccessToken, setCredentials, setUnauthenticated } from './authSlice';
import { clearRoleCookie } from '@/lib/cookies';
import { hasActiveSessionFlag, clearActiveSessionFlag } from '@/lib/activeSession';

// Guards against running this effect's logic more than once per real page load. Belt-and-
// suspenders alongside the sessionStorage check below: on Vercel's production hosting, the
// client-side login -> /vendor (or /customer, /delivery, /admin) transition has been observed
// to sometimes fall back to a full document reload rather than staying a soft client-side nav
// (Next.js's own documented recovery behavior when a background route transition doesn't
// resolve as expected) — which re-executes this whole module from scratch, including this
// flag. A module scope survives a component remount but NOT a true document reload, which is
// exactly why the sessionStorage check below (not this flag) is the one actually responsible
// for not discarding a just-established session across that kind of reload.
let hasBootstrapped = false;

// Access tokens live only in memory (Redux), so a hard refresh loses them. On mount we ask
// whether the httpOnly refresh cookie is still good — but only actually restore the session
// (populate Redux, land the user back in their dashboard) when either (a) that cookie was
// issued with "Remember me" checked, or (b) this exact browser TAB already had an actively,
// explicitly established session (see lib/activeSession.js — sessionStorage, so it survives a
// reload of this same tab but does not carry over to a genuinely separate new tab). Without
// (b), a login that merely happens to get reloaded internally — e.g. Next.js's client router
// falling back to a full document reload right after an explicit, non-"remembered" login —
// would look identical to "user reopened the app later" and silently bounce them back out
// seconds after they signed in. Every OTHER fresh tab (no flag, no remember-me cookie) still
// requires an explicit login, which is the actual point of this whole mechanism — per product
// direction, opening the app fresh must never silently resume a stale session.
function SessionBootstrapper({ children }) {
  const dispatch = useDispatch();
  const store = useStore();

  useEffect(() => {
    if (hasBootstrapped) return;
    hasBootstrapped = true;

    const wasActiveThisTab = hasActiveSessionFlag();

    (async () => {
      try {
        const refreshResult = await dispatch(authApi.endpoints.refresh.initiate()).unwrap();
        const accessToken = refreshResult?.data?.accessToken;
        const remembered = Boolean(refreshResult?.data?.rememberMe);
        if (!accessToken || !(remembered || wasActiveThisTab)) throw new Error('Not a remembered session');

        dispatch(setAccessToken(accessToken));
        const meResult = await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap();
        dispatch(setCredentials({ user: meResult.data, accessToken, rememberMe: remembered }));
      } catch (err) {
        // Defense in depth: if the user is already authenticated by the time this resolves
        // (e.g. this check started before, but resolved after, a fast explicit login), never
        // let a stale/duplicate check downgrade that live session — only discard pre-login.
        if (store.getState().auth.status === 'authenticated') return;
        dispatch(setUnauthenticated());
        if (typeof window !== 'undefined') {
          clearRoleCookie();
          clearActiveSessionFlag();
        }
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
