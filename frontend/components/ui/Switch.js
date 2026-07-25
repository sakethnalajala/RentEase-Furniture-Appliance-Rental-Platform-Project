'use client';

import { motion } from 'framer-motion';

export default function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`flex items-center justify-between gap-4 py-2.5 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span>
        {label && <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>}
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-gradient-to-r from-brand-600 to-brand-500' : 'bg-slate-300 dark:bg-white/15'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: checked ? '22px' : '2px' }}
        />
      </button>
    </label>
  );
}
