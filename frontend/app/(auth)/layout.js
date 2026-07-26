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
    // Outer wrapper owns position/size/visibility (unchanged from before — same lg:w-[42%],
    // lg:ml-6/xl:ml-10 spacing, same hidden-below-lg behavior) plus the new premium frame
    // effects layered around it. `group` scopes the hover lift/glow below to real pointer
    // devices only, since this whole panel is already hidden below the lg breakpoint.
    <div className="group relative hidden lg:ml-6 lg:block lg:w-[42%] xl:ml-10">
      {/* Soft ambient neon glow halo — brand/accent colored, sitting behind the panel; gently
          brightens on hover. Pure opacity transition on a static blurred gradient, so it costs
          nothing per-frame beyond the hover transition itself. */}
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-500/40 via-accent-500/20 to-brand-400/40 opacity-60 blur-3xl transition-opacity duration-700 ease-out group-hover:opacity-90" />

      {/* The actual panel — every existing child, position, and color below is unchanged.
          Only this container's own treatment is new: rounded corners, the slowly-rotating
          gradient border (.gradient-border-animated, see globals.css), a floating shadow with
          a soft inset top highlight for depth, and a very subtle lift on hover. */}
      <div className="gradient-border-animated relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 p-10 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_48px_-12px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-500 ease-out group-hover:-translate-y-1">
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
