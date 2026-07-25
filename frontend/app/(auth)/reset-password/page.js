'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useResetPasswordMutation } from '@/store/authApi';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [resetPassword, { isLoading, isSuccess, error }] = useResetPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    try {
      await resetPassword({ token, newPassword }).unwrap();
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      // surfaced via `error` below
    }
  };

  if (!token) {
    return (
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        Missing reset token.{' '}
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Request a new link
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={26} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Password reset</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Spinner size="sm" /> Redirecting you to login…
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
        <Lock size={20} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Choose a new password</h1>
      <div className="mt-6 flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hint="At least 8 characters, one uppercase letter, one number."
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={mismatch ? 'Passwords do not match.' : undefined}
        />
      </div>
      {error && <p className="mt-2 text-sm text-rose-500">{error.data?.message || 'Reset failed.'}</p>}
      <Button type="submit" loading={isLoading} className="mt-4 w-full">
        Reset password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
