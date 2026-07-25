'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import AuroraBackground from '@/components/ui/AuroraBackground';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-24">
      <AuroraBackground className="opacity-100" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong relative flex max-w-md flex-col items-center rounded-3xl p-10 text-center shadow-glass dark:shadow-glass-dark"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <AlertTriangle size={28} />
        </div>

        <h1 className="mt-6 font-display text-xl font-bold text-slate-900 dark:text-white">Something went wrong.</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          An unexpected error occurred. You can try again, or head back to safety.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-premium transition-transform hover:scale-[1.02]"
          >
            <RefreshCw size={15} /> Try again
          </button>
          <Link
            href="/"
            className="glass inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-white"
          >
            <Home size={15} /> Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
