'use client';

import { useRef, useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { makeStore } from './store';
import { authApi } from './authApi';
import { setAccessToken, setCredentials, setUnauthenticated } from './authSlice';
import { clearRoleCookie } from '@/lib/cookies';

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
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    (async () => {
      try {
        const refreshResult = await dispatch(authApi.endpoints.refresh.initiate()).unwrap();
        const accessToken = refreshResult?.data?.accessToken;
        if (!accessToken || !refreshResult?.data?.rememberMe) throw new Error('Not a remembered session');

        dispatch(setAccessToken(accessToken));
        const meResult = await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap();
        dispatch(setCredentials({ user: meResult.data, accessToken, rememberMe: true }));
      } catch (err) {
        dispatch(setUnauthenticated());
        if (typeof window !== 'undefined') clearRoleCookie();
      }
    })();
  }, [dispatch]);

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
