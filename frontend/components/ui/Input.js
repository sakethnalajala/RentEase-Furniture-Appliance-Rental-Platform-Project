'use client';

import { motion } from 'framer-motion';

export default function Input({ label, error, hint, id, className = '', ...props }) {
  const inputId = id || props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <motion.input
        id={inputId}
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={`focus-ring rounded-xl border bg-white/70 px-3.5 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400 backdrop-blur-sm transition-colors
          dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500
          ${error ? 'border-rose-400 dark:border-rose-500/70' : 'border-slate-300 dark:border-white/10'}
          ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-xs text-rose-500"
        >
          {error}
        </motion.p>
      )}
      {!error && hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
