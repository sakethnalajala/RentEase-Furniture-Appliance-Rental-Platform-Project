'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, SearchX } from 'lucide-react';
import AuroraBackground from '@/components/ui/AuroraBackground';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-24">
      <AuroraBackground className="opacity-100" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong relative flex max-w-md flex-col items-center rounded-3xl p-10 text-center shadow-glass dark:shadow-glass-dark"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-glow"
        >
          <SearchX size={28} />
        </motion.div>

        <p className="text-gradient mt-6 font-display text-6xl font-bold">404</p>
        <h1 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
          This page moved out.
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The page you’re looking for doesn’t exist, or hasn’t been built yet — RentEase ships in phases.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-premium transition-transform hover:scale-[1.02]"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </motion.div>
    </div>
  );
}
