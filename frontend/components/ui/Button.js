'use client';

import { motion } from 'framer-motion';
import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-premium hover:shadow-glow hover:from-brand-500 hover:to-brand-400',
  accent:
    'bg-gradient-to-r from-accent-600 to-accent-500 text-white shadow-premium hover:shadow-glow-accent',
  secondary:
    'glass text-slate-900 hover:bg-white/90 dark:text-white dark:hover:bg-white/10',
  danger: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-premium hover:shadow-lg',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10',
};

const SIZES = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      whileHover={disabled || loading ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </motion.button>
  );
}
