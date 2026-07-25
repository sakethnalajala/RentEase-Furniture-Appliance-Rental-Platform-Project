'use client';

import { useRef, useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { makeStore } from './store';
import { authApi } from './authApi';
import { setAccessToken, setCredentials, setUnauthenticated } from './authSlice';

// Access tokens live only in memory (Redux), so a hard refresh loses them. On first mount
// we silently redeem the httpOnly refresh cookie for a new access token, then fetch the
// current user — restoring the session without the user having to log in again.
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
        if (!accessToken) throw new Error('No access token returned');

        dispatch(setAccessToken(accessToken));
        const meResult = await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap();
        // Re-apply the exact same rememberMe the backend reports for this session (echoed back
        // on every /auth/refresh) so the non-httpOnly rentease_role cookie stays in lockstep
        // with the real httpOnly refresh cookie's own persistence — otherwise a remembered
        // session would get silently downgraded to session-only the first time this bootstrapper
        // runs after a browser restart.
        dispatch(setCredentials({ user: meResult.data, accessToken, rememberMe: refreshResult?.data?.rememberMe }));
      } catch (err) {
        dispatch(setUnauthenticated());
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
