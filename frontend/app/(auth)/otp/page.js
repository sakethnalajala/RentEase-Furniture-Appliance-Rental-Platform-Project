'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ShieldCheck } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useRequestOtpMutation, useVerifyOtpMutation, useVerifyLogin2FAMutation } from '@/store/authApi';
import { getRoleHomePath } from '@/lib/roleRedirect';

function StepIcon({ Icon }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
      <Icon size={20} />
    </div>
  );
}

function RequestOtpForm({ onSent, phone, setPhone }) {
  const [requestOtp, { isLoading, error }] = useRequestOtpMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await requestOtp({ phone }).unwrap();
      const demoOtp = res.data?.demoOtp;
      if (demoOtp) {
        toast.success('OTP Sent Successfully', {
          description: `Demo Mode — no SMS was actually sent. Your code is ${demoOtp} (any 6 digits will work).`,
          duration: 8000,
        });
      } else {
        toast.success('OTP Sent Successfully');
      }
      onSent();
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepIcon Icon={Smartphone} />
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Log in with phone</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        We’ll text you a 6-digit code. <span className="text-slate-400 dark:text-slate-500">(Demo Mode: any 6 digits work.)</span>
      </p>
      <div className="mt-6">
        <Input label="Phone number" name="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error.data?.message || 'Could not send OTP.'}</p>}
      <Button type="submit" loading={isLoading} className="mt-4 w-full">
        Send code
      </Button>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to email login
        </Link>
      </p>
    </form>
  );
}

function VerifyOtpForm({ phone }) {
  const [code, setCode] = useState('');
  const [verifyOtp, { isLoading, error }] = useVerifyOtpMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await verifyOtp({ phone, code }).unwrap();
      if (res.data?.accessToken) toast.success('Login Successful');
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepIcon Icon={ShieldCheck} />
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Enter your code</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sent to {phone}.</p>
      <div className="mt-6">
        <Input
          label="6-digit code"
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

function TwoFactorStep({ tempToken }) {
  const [code, setCode] = useState('');
  const [verify, { isLoading, error }] = useVerifyLogin2FAMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await verify({ tempToken, code }).unwrap();
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepIcon Icon={ShieldCheck} />
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

export default function OtpLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('request'); // request | verify
  const { status, user, requires2FA, tempToken } = useSelector((state) => state.auth);

  useEffect(() => {
    if (status === 'authenticated' && user) router.replace(getRoleHomePath(user.role));
  }, [status, user, router]);

  const view = requires2FA ? '2fa' : step;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.25 }}
      >
        {view === '2fa' && <TwoFactorStep tempToken={tempToken} />}
        {view === 'verify' && <VerifyOtpForm phone={phone} />}
        {view === 'request' && <RequestOtpForm phone={phone} setPhone={setPhone} onSent={() => setStep('verify')} />}
      </motion.div>
    </AnimatePresence>
  );
}
