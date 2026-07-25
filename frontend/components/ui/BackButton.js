'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallbackHref, label = 'Back', className = '' }) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (fallbackHref) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.96 }}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/60 px-3.5 py-2 text-sm font-medium text-slate-600 backdrop-blur transition-colors hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
    >
      <ArrowLeft size={15} />
      {label}
    </motion.button>
  );
}
