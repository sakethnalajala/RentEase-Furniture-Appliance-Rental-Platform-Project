'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MailCheck, User, Building2, Truck, CheckCircle2, ShieldCheck } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import DemoAccountCard from '@/components/ui/DemoAccountCard';
import { TwoFactorVerifyForm, TwoFactorSetupForm } from '@/components/auth/TwoFactorViews';
import { useRegisterMutation, useListCitiesQuery, useLoginMutation } from '@/store/authApi';
import { DEMO_ACCOUNTS, DELIVERY_PARTNER_BY_CITY } from '@/lib/demoAccounts';
import { getRoleHomePath } from '@/lib/roleRedirect';

const ROLES = [
  { value: 'customer', label: 'Customer', icon: User },
  { value: 'vendor', label: 'Vendor', icon: Building2 },
  { value: 'delivery_partner', label: 'Delivery', icon: Truck },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
];

const selectClasses =
  'focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    // No role pre-selected — every account-type tile starts inactive, and the demo card /
    // registration form stay hidden until the user explicitly picks one.
    role: '',
    businessName: '',
    cityId: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
  });
  const [result, setResult] = useState(null); // { demoMode } once submitted successfully (non-demo / auto-login-failed fallback only)
  const [register, { isLoading, error }] = useRegisterMutation();
  const [demoLogin, { isLoading: isDemoLoggingIn }] = useLoginMutation();
  const [autoLogin, { isLoading: isAutoLoggingIn }] = useLoginMutation();
  const { data: citiesData } = useListCitiesQuery();
  const cities = citiesData?.data || [];
  // Mirrors login/page.js's own requires2FA/requires2FASetup state read — a Demo Admin login
  // kicked off from THIS page must show the exact same inline 2FA verify/setup screens the
  // Login page shows, not silently skip 2FA or bounce to a different page to complete it.
  const { requires2FA, requires2FASetup, tempToken } = useSelector((state) => state.auth);

  // Same per-city Delivery Partner demo account the login page uses — see its own comment for
  // why this is the one role with more than one canonical demo account.
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const activeDemoAccount = !form.role
    ? null
    : form.role === 'delivery_partner'
    ? DELIVERY_PARTNER_BY_CITY[selectedCity?.name] || DELIVERY_PARTNER_BY_CITY.Hyderabad
    : DEMO_ACCOUNTS[form.role];

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await register(form).unwrap();
      const demoMode = Boolean(res.data?.demoMode);

      // Every self-registerable role (including Vendor, which used to sit behind a manual
      // Admin approval gate — that requirement has been removed; new vendors are auto-approved
      // server-side) can log in immediately in Demo Mode, so sign the just-created account
      // straight in and land them on their real dashboard, instead of making them retype their
      // own credentials on a separate /login screen.
      if (demoMode) {
        try {
          const loginRes = await autoLogin({ email: form.email, password: form.password, role: form.role }).unwrap();
          if (loginRes.data?.user) {
            toast.success('Login successful.');
            router.replace(getRoleHomePath(loginRes.data.user.role));
            return;
          }
          // Mandatory 2FA setup (Admin only) — handleAuthResult already put Redux into the
          // `requires2FASetup` state; this page's own render (below) reads that same state and
          // shows the inline setup screen immediately, no redirect to a different page needed.
          return;
        } catch {
          // Fall through to the generic success screen below — registration itself still
          // succeeded even if this convenience auto-login didn't.
        }
      }

      toast.success(res.message);
      setResult({ demoMode });
    } catch {
      // error surfaced below via RTK Query error state
    }
  };

  const handleDemoLogin = async () => {
    const account = activeDemoAccount;
    try {
      const res = await demoLogin({ email: account.email, password: account.password, role: form.role }).unwrap();
      if (res.data?.user) {
        // Redirect straight off this response's own user object (see the matching fix in
        // login/page.js) rather than observing Redux state, so this always lands on the
        // account that was actually just authenticated, never a stale previous session.
        toast.success(`Logged in as ${account.label}.`);
        router.replace(getRoleHomePath(res.data.user.role));
      }
      // else: mandatory 2FA (Demo Admin) — the login mutation's onQueryStarted already moved
      // Redux into requires2FA/requires2FASetup, and this page's own render (below) switches to
      // the matching inline TwoFactorVerifyForm/TwoFactorSetupForm — same behavior as /login,
      // no redirect to a different page.
    } catch {
      toast.error('Demo login failed. Please try again.');
    }
  };

  // Same inline 2FA verify/setup screens the Login page shows — driven by the same global
  // Redux state, so a Demo Admin login started from Sign Up goes through the identical
  // mandatory-2FA flow instead of logging straight in or bouncing to a different page.
  if (requires2FASetup || requires2FA) {
    const onAuthenticated = (freshUser) => router.replace(getRoleHomePath(freshUser.role));
    return requires2FASetup ? (
      <TwoFactorSetupForm tempToken={tempToken} onAuthenticated={onAuthenticated} />
    ) : (
      <TwoFactorVerifyForm tempToken={tempToken} onAuthenticated={onAuthenticated} />
    );
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            result.demoMode
              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {result.demoMode ? <CheckCircle2 size={26} /> : <MailCheck size={26} />}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
          {result.demoMode ? 'Account created!' : 'Check your inbox'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {result.demoMode ? (
            'Your account is ready — log in with the credentials you just created.'
          ) : (
            <>
              We’ve sent a verification link to <strong>{form.email}</strong>. Verify your email to activate your
              account, then log in.
            </>
          )}
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Go to login
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Join RentEase as a customer, vendor, delivery partner, or admin.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROLES.map((r) => (
          <button
            type="button"
            key={r.value}
            onClick={() => setForm((f) => ({ ...f, role: r.value }))}
            className={`focus-ring flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${
              form.role === r.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400/60 dark:bg-brand-400/10 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
          >
            <r.icon size={16} />
            {r.label}
          </button>
        ))}
      </div>

      {!form.role ? (
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
              key={`${form.role}-${activeDemoAccount.email}`}
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
              {form.role === 'delivery_partner' && (
                <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                  Uses your selected city ({selectedCity?.name || 'Hyderabad'}) — change city from the header above to try another city&apos;s delivery partner.
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            or create your own
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Full name" name="name" required value={form.name} onChange={update('name')} />
            <Input label="Email" name="email" type="email" required value={form.email} onChange={update('email')} />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={update('password')}
              hint="At least 8 characters, one uppercase letter, one number."
            />
            <Input label="Phone (optional)" name="phone" value={form.phone} onChange={update('phone')} />

            <AnimatePresence>
              {(form.role === 'vendor' || form.role === 'delivery_partner') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-4 overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Operating city</label>
                    <select value={form.cityId} onChange={update('cityId')} required className={selectClasses}>
                      <option value="" disabled>
                        Select a city
                      </option>
                      {cities.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.role === 'vendor' && (
                    <Input
                      label="Business name"
                      name="businessName"
                      required
                      value={form.businessName}
                      onChange={update('businessName')}
                    />
                  )}

                  {form.role === 'delivery_partner' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle type</label>
                        <select value={form.vehicleType} onChange={update('vehicleType')} className={selectClasses}>
                          <option value="bike">Bike</option>
                          <option value="van">Van</option>
                          <option value="truck">Truck</option>
                        </select>
                      </div>
                      <Input
                        label="Vehicle number"
                        name="vehicleNumber"
                        required
                        value={form.vehicleNumber}
                        onChange={update('vehicleNumber')}
                      />
                      <Input
                        label="License number"
                        name="licenseNumber"
                        required
                        value={form.licenseNumber}
                        onChange={update('licenseNumber')}
                      />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="text-sm text-rose-500">{error.data?.message || 'Registration failed. Please try again.'}</p>
            )}

            <Button type="submit" loading={isLoading || isAutoLoggingIn} className="mt-2 w-full">
              Create account
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Log in
        </Link>
      </p>
    </div>
  );
}
