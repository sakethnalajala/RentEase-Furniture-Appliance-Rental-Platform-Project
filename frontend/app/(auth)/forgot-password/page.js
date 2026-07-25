'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MailCheck, KeyRound } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useForgotPasswordMutation } from '@/store/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await forgotPassword({ email });
  };

  if (isSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MailCheck size={26} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          If an account exists for <strong>{email}</strong>, a password reset link is on its way.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to login
        </Link>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
        <KeyRound size={20} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Forgot your password?</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your email and we’ll send a reset link.</p>
      <div className="mt-6">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" loading={isLoading} className="mt-4 w-full">
        Send reset link
      </Button>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to login
        </Link>
      </p>
    </form>
  );
}
