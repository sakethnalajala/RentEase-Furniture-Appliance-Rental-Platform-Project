'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';

const HIGHLIGHTS = [
  'City-scoped inventory across 4 metros',
  'Vendor listings verified by our Admin team',
  'Flexible 1, 3, 6 & 12-month rental plans',
];

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 lg:ml-6 lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-10 xl:ml-10">
      <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 animate-blob rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 animate-blob rounded-full bg-white/10 blur-3xl [animation-delay:6s]" />

      <div className="relative flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white backdrop-blur">
          R
        </span>
        <span className="text-xl font-bold text-white">RentEase</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative"
      >
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          <Sparkles size={13} /> Trusted by renters across India
        </div>
        <h2 className="font-display text-3xl font-bold leading-tight text-white">
          Everything you need, nothing you have to own.
        </h2>
        <ul className="mt-6 space-y-3">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-sm text-white/90">
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-white" />
              {h}
            </li>
          ))}
        </ul>
      </motion.div>

      <p className="relative text-xs text-white/60">© {new Date().getFullYear()} RentEase</p>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card variant="glass" className="p-8 shadow-glass dark:shadow-glass-dark">
            {children}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
