'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, Building2, Truck } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import GoogleIcon from '@/components/ui/GoogleIcon';
import DemoAccountCard from '@/components/ui/DemoAccountCard';
import { TwoFactorVerifyForm, TwoFactorSetupForm } from '@/components/auth/TwoFactorViews';
import {
  useLoginMutation,
  useLazyListGoogleAccountsQuery,
  useSelectGoogleAccountMutation,
} from '@/store/authApi';
import { DEMO_ACCOUNTS, DELIVERY_PARTNER_BY_CITY } from '@/lib/demoAccounts';
import { getRoleHomePath } from '@/lib/roleRedirect';

const LOGIN_DEMO_ROLES = [
  { key: 'customer', label: 'Customer', icon: User },
  { key: 'vendor', label: 'Vendor', icon: Building2 },
  { key: 'delivery_partner', label: 'Delivery', icon: Truck },
  { key: 'admin', label: 'Admin', icon: ShieldCheck },
];

function LoginForm({ onAuthenticated }) {
  const [form, setForm] = useState({ email: '', password: '' });
  // Unchecked by default — a login only survives a full browser close+reopen if this is
  // explicitly checked; otherwise the backend issues a session-only cookie (see auth.controller
  // .js's refreshCookieOptions). Demo-tile and Google logins never set this — they always sign
  // in session-only.
  const [rememberMe, setRememberMe] = useState(false);
  // No role pre-selected — every account-type tile starts inactive, and the demo card / manual
  // login form below stay hidden until the user explicitly picks one.
  const [demoRole, setDemoRole] = useState(null);
  const [login, { isLoading, error }] = useLoginMutation();
  const [demoLogin, { isLoading: isDemoLoggingIn }] = useLoginMutation();
  const [fetchGoogleAccounts, { isFetching: isLoadingGoogleAccounts }] = useLazyListGoogleAccountsQuery();
  const [selectGoogleAccount, { isLoading: isSelectingGoogleAccount }] = useSelectGoogleAccountMutation();

  // Delivery Partner is the one role with a genuine per-city demo account — every other role's
  // demo tile stays a single fixed account. Whichever city is currently selected (the same
  // CitySelector used everywhere else in the app) picks which city's account this resolves to,
  // falling back to Hyderabad (the original account) if none is selected yet.
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const activeDemoAccount = !demoRole
    ? null
    : demoRole === 'delivery_partner'
    ? DELIVERY_PARTNER_BY_CITY[selectedCity?.name] || DELIVERY_PARTNER_BY_CITY.Hyderabad
    : DEMO_ACCOUNTS[demoRole];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // The role tab selected above (`demoRole` — shared with the demo card, since it's the
      // same account-type selector for this whole page) is sent along with the credentials so
      // the backend can enforce it strictly: entering a Vendor's email/password while the
      // Customer tab is selected must fail, not silently log in as Vendor.
      const res = await login({ ...form, role: demoRole, rememberMe }).unwrap();
      toast.success('Login successful.');
      // Redirect straight off this response's own user object — not off Redux state, which
      // can still hold a *different* previously-logged-in account for a render or two after
      // this resolves. Using the fresh, just-returned user guarantees the destination always
      // matches the account that was actually just authenticated. (2FA challenge responses
      // have no `user` here — the view switches itself via `requires2FA`/`requires2FASetup`.)
      if (res.data?.user) onAuthenticated(res.data.user);
    } catch {
      // surfaced via `error` below
    }
  };

  const handleDemoLogin = async () => {
    const account = activeDemoAccount;
    try {
      const res = await demoLogin({ email: account.email, password: account.password, role: demoRole }).unwrap();
      if (res.data?.user) {
        toast.success(`Logged in as ${account.label}.`);
        onAuthenticated(res.data.user);
      }
      // else: mandatory 2FA (Demo Admin) — Redux's requires2FA/requires2FASetup already flipped
      // this page's own `view` to the matching form (see LoginPage below); no fake "logged in"
      // toast until that actually completes.
    } catch (err) {
      // A generic "failed, try again" toast was indistinguishable between "wrong credentials"
      // and "the request never reached the server at all" (network/CORS failure) — exactly the
      // ambiguity that made a real backend outage look identical to a demo-data problem.
      // RTK Query's rejected shape carries enough to tell these apart: `err.status === 'FETCH_ERROR'`
      // means the browser never got a response (network/CORS/DNS — see err.error for the raw
      // reason); any other `status` is a real HTTP response from the API with its own message.
      // eslint-disable-next-line no-console
      console.error('Demo login failed:', err);
      if (err?.status === 'FETCH_ERROR') {
        toast.error(`Could not reach the server (${err.error || 'network error'}). Check the browser console/Network tab for details.`);
      } else {
        toast.error(err?.data?.message || 'Demo login failed. Please try again.');
      }
    }
  };

  // Signs straight into one specific account — never a picker. Which account that is was
  // already decided by handleGoogleClick below (the platform demo account when none exist yet,
  // the sole account when exactly one does, or the most-recently-created one otherwise).
  const finishGoogleLogin = async (account) => {
    try {
      const res = await selectGoogleAccount({ role: demoRole, email: account.email }).unwrap();
      if (res.data?.user) {
        toast.success(`Logged in as ${res.data.user.name}.`);
        onAuthenticated(res.data.user);
      }
      // 2FA challenge responses (no `user`) need no extra handling here — handleAuthResult
      // already moved Redux into requires2FA/requires2FASetup, and this page's own `view`
      // switches to the matching form on its next render.
    } catch (err) {
      toast.error(err?.data?.message || 'Could not sign in with this account.');
    }
  };

  // Never shows an account picker. The backend already returns real (non-seed) accounts for
  // this role sorted most-recently-created first (see listGoogleAccounts), so accounts[0] here
  // is always "the most recently created account" — exactly what a lone real account and a
  // multi-account tie both resolve to, with zero UI branching between those two cases.
  const handleGoogleClick = async () => {
    try {
      const res = await fetchGoogleAccounts({ role: demoRole, city: demoRole === 'delivery_partner' ? selectedCity?.name : undefined }).unwrap();
      const { accounts, demoAccount } = res.data;

      if (accounts.length > 0) {
        await finishGoogleLogin(accounts[0]);
      } else if (demoAccount) {
        // No real accounts exist for this role yet — only now does the demo account apply.
        await finishGoogleLogin(demoAccount);
      } else {
        toast.error('No account found. Please create an account first.');
      }
    } catch {
      toast.error('Could not load accounts for Google sign-in. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Log in to manage your rentals.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOGIN_DEMO_ROLES.map((r) => (
          <button
            type="button"
            key={r.key}
            onClick={() => setDemoRole(r.key)}
            className={`focus-ring flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
              demoRole === r.key
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400/60 dark:bg-brand-400/10 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
          >
            <r.icon size={15} />
            {r.label}
          </button>
        ))}
      </div>

      {!demoRole ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400"
        >
          Select an account type above to continue.
        </motion.p>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${demoRole}-${activeDemoAccount.email}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DemoAccountCard
                title={activeDemoAccount.label}
                fields={activeDemoAccount.fields}
                buttonLabel={`Login as ${activeDemoAccount.label}`}
                loading={isDemoLoggingIn}
                onLogin={handleDemoLogin}
                className="mt-4"
              />
              {demoRole === 'delivery_partner' && (
                <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                  Uses your selected city ({selectedCity?.name || 'Hyderabad'}) — change city from the header above to try another city&apos;s delivery partner.
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            or use your own account
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoadingGoogleAccounts || isSelectingGoogleAccount}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 py-2.5 text-sm font-medium text-slate-700 backdrop-blur transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {isLoadingGoogleAccounts || isSelectingGoogleAccount ? <Spinner size="sm" /> : <GoogleIcon size={16} />}
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            or
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <p className="-mt-1 mb-1 text-xs text-slate-400 dark:text-slate-500">
            Logging in as <span className="font-medium text-slate-600 dark:text-slate-300">{activeDemoAccount.label.replace('Demo ', '')}</span> — switch the tab above to change account type.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            {error && <p className="text-sm text-rose-500">{error.data?.message || 'Login failed.'}</p>}
            <div className="flex items-center justify-between">
              <label className="flex select-none items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="focus-ring h-3.5 w-3.5 rounded border-slate-300 text-brand-600 dark:border-white/20"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" loading={isLoading} className="w-full">
              Log in
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Prefer phone?{' '}
        <Link href="/otp" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Log in with OTP
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Create an account
        </Link>
      </p>
    </div>
  );
}

// Surfaces `?error=...` (set by the backend's Google OAuth redirect — real failures, the
// simulated-login fallback when no demo account exists, or Google being unconfigured outside
// Demo Mode) as a toast instead of leaving it as a silently-ignored query param. Isolated in
// its own component because `useSearchParams()` requires a Suspense boundary in the App Router.
function GoogleAuthErrorToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const message = searchParams.get('error');
    if (message) toast.error(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { requires2FA, requires2FASetup, tempToken } = useSelector((state) => state.auth);

  // Deliberately NOT redirecting off Redux's `status`/`user` here (e.g. "if already
  // authenticated, bounce away"). That pattern was the root cause of a real bug: a user still
  // signed in as one role (say, delivery partner, from earlier testing) who opened /login to
  // sign in as a *different*, newly-created account (say, vendor) got redirected to their OLD
  // role's dashboard before/around the new submit — "I logged in as my new Vendor account but
  // it opened the Delivery Partner dashboard" — because the effect fired off stale/mid-flight
  // Redux state rather than the account that was actually just authenticated. Each form below
  // instead calls `onAuthenticated` directly from its own mutation's fresh response, so the
  // redirect target is always computed from the user object that specific request returned.
  const onAuthenticated = (freshUser) => router.replace(getRoleHomePath(freshUser.role));

  const view = requires2FASetup ? 'setup' : requires2FA ? 'verify' : 'login';

  return (
    <>
      <Suspense fallback={null}>
        <GoogleAuthErrorToast />
      </Suspense>
      <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.25 }}
      >
        {view === 'setup' && <TwoFactorSetupForm tempToken={tempToken} onAuthenticated={onAuthenticated} />}
        {view === 'verify' && <TwoFactorVerifyForm tempToken={tempToken} onAuthenticated={onAuthenticated} />}
        {view === 'login' && <LoginForm onAuthenticated={onAuthenticated} />}
      </motion.div>
      </AnimatePresence>
    </>
  );
}
