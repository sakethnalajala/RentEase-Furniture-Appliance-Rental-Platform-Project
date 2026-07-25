'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, MailQuestion } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useVerifyEmailMutation, useResendVerificationMutation } from '@/store/authApi';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifyEmail, { isLoading, isSuccess, error }] = useVerifyEmailMutation();
  const [resend, { isLoading: isResending, isSuccess: resent }] = useResendVerificationMutation();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (token) verifyEmail({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          resend({ email });
        }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
          <MailQuestion size={20} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
          Resend verification email
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we’ll send a new verification link.
        </p>
        <div className="mt-6">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" loading={isResending} className="mt-4 w-full">
          Send link
        </Button>
        {resent && (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            If that email exists, a new link is on its way.
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="text-center">
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Spinner />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying your email…</p>
        </div>
      )}
      {isSuccess && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Email verified</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your account is ready. You can log in now.</p>
        </motion.div>
      )}
      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <XCircle size={26} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Link expired or invalid</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error.data?.message}</p>
        </motion.div>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
        Go to login
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
