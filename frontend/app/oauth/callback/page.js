'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import Spinner from '@/components/ui/Spinner';
import { authApi, prefetchDashboard } from '@/store/authApi';
import { api } from '@/store/api';
import { setAccessToken, setCredentials, setUnauthenticated } from '@/store/authSlice';
import { getRoleHomePath } from '@/lib/roleRedirect';

// Destination the server's /auth/google/callback redirects to with ?accessToken=...
// (the refresh token itself already arrived as an httpOnly cookie on that same response).
function OAuthCallbackContent() {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const accessToken = searchParams.get('accessToken');
    if (!accessToken) {
      router.replace('/login?error=google_auth_failed');
      return;
    }

    (async () => {
      try {
        dispatch(setAccessToken(accessToken));
        // Clears any previous account's cached queries before fetching this one's profile —
        // same reasoning as the resetApiState() dispatch in authApi.js's handleAuthResult:
        // switching accounts in one tab (e.g. testing Google sign-in as a different demo role
        // right after another session) must never serve stale cross-account data.
        dispatch(api.util.resetApiState());
        const meResult = await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap();
        dispatch(setCredentials({ user: meResult.data, accessToken }));
        // Same instant-dashboard prefetch every other login path gets (see authApi.js) — without
        // this, Google sign-in specifically was the one flow that left the destination portal to
        // fetch everything cold after landing, which is what made it feel slower than the rest.
        dispatch((_, getState) => prefetchDashboard(meResult.data, dispatch, getState));
        toast.success('Login successful.');
        router.replace(getRoleHomePath(meResult.data.role));
      } catch {
        dispatch(setUnauthenticated());
        router.replace('/login?error=google_auth_failed');
      }
    })();
  }, [dispatch, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-glow">
        <Spinner size="sm" />
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">Signing you in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
