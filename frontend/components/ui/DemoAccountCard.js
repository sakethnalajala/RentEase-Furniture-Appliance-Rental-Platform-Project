'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Button from './Button';

export default function DemoAccountCard({ title, fields, buttonLabel, onLogin, loading, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/80 to-white/50 p-6 shadow-premium backdrop-blur-xl transition-shadow duration-300 hover:shadow-glow dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.02] ${className}`}
    >
      {/* Animated glow ring on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-500/0 via-transparent to-accent-500/0 opacity-0 transition-opacity duration-500 group-hover:from-brand-500/20 group-hover:to-accent-500/20 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />

      <div className="relative flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-premium">
          <Sparkles size={16} />
        </span>
        <p className="text-base font-bold text-slate-900 dark:text-white">{title}</p>
      </div>

      <dl className="relative mt-5 space-y-3">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-4">
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{f.label}</dt>
            <dd
              className={`truncate text-right font-mono text-sm ${
                f.highlight
                  ? 'rounded-full bg-emerald-500/15 px-2.5 py-1 font-sans text-[13px] font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'font-semibold text-slate-800 dark:text-slate-100'
              }`}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <Button
        type="button"
        variant="secondary"
        size="md"
        loading={loading}
        onClick={onLogin}
        className="relative mt-6 w-full text-[15px] font-semibold shadow-premium transition-transform group-hover:scale-[1.02]"
      >
        {buttonLabel}
      </Button>
    </motion.div>
  );
}
