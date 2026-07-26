'use client';

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
  useVerifyLogin2FAMutation,
  useSetup2FAMutation,
  useEnable2FAMutation,
} from '@/store/authApi';
import { cancelTwoFactor } from '@/store/authSlice';

// Shared between /login and /register — both pages drive this off the same global Redux
// requires2FA/requires2FASetup/tempToken state, so a Demo Admin login started from either page
// goes through the exact same verify/setup screens rather than each page reinventing (or, worse,
// skipping) its own copy of the mandatory-2FA flow.

export function BackToLoginButton() {
  const dispatch = useDispatch();
  return (
    <button
      type="button"
      onClick={() => dispatch(cancelTwoFactor())}
      className="focus-ring -ml-1.5 mb-4 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
    >
      <ArrowLeft size={15} /> Back
    </button>
  );
}

export function TwoFactorVerifyForm({ tempToken, onAuthenticated }) {
  const [code, setCode] = useState('');
  const [verify, { isLoading, error }] = useVerifyLogin2FAMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await verify({ tempToken, code }).unwrap();
      if (res.data?.user) {
        toast.success('Login successful.');
        onAuthenticated(res.data.user);
      }
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <BackToLoginButton />
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
        <ShieldCheck size={20} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Two-factor authentication</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter the 6-digit code from your authenticator app.</p>
      <div className="mt-6">
        <Input
          label="Authentication code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error.data?.message || 'Verification failed.'}</p>}
      <Button type="submit" loading={isLoading} className="mt-4 w-full">
        Verify & log in
      </Button>
    </form>
  );
}

export function TwoFactorSetupForm({ tempToken, onAuthenticated }) {
  const [setup2FA, { data: setupData, isLoading: isSettingUp }] = useSetup2FAMutation();
  const [enable2FA, { isLoading: isEnabling, error }] = useEnable2FAMutation();
  const [code, setCode] = useState('');
  const [currentTempToken, setCurrentTempToken] = useState(tempToken);

  useEffect(() => {
    setup2FA({ tempToken })
      .unwrap()
      .then((res) => setCurrentTempToken(res.data.tempToken));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await enable2FA({ tempToken: currentTempToken, code }).unwrap();
      if (res.data?.user) {
        toast.success('Login successful.');
        onAuthenticated(res.data.user);
      }
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <BackToLoginButton />
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
        <ShieldCheck size={20} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
        Set up two-factor authentication
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Required for Admin accounts. Scan the QR code with an authenticator app (e.g. Google
        Authenticator).
      </p>

      <div className="mt-6 flex justify-center">
        {isSettingUp && <p className="text-sm text-slate-500 dark:text-slate-400">Generating your QR code…</p>}
        {setupData?.data?.qrCodeDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={setupData.data.qrCodeDataUrl}
            alt="2FA QR code"
            className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10"
          />
        )}
      </div>

      <div className="mt-6">
        <Input
          label="Confirm with a code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error.data?.message || 'Verification failed.'}</p>}
      <Button type="submit" loading={isEnabling} className="mt-4 w-full">
        Enable & log in
      </Button>
    </form>
  );
}
