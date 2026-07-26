import Spinner from './Spinner';

// Shared route-level loading UI for every portal's app/**/loading.js — Next.js renders this
// as an automatic Suspense fallback the instant a navigation starts, replacing only the
// portal's content area (the sidebar/header in each portal's own layout.js stays mounted and
// visible throughout). Deliberately has no 'use client' and no framer-motion import — it needs
// to paint as fast as humanly possible, so it's plain server-renderable markup with CSS-only
// animations, never a blank white flash.
export default function PortalLoading() {
  return (
    <div className="flex min-h-[60vh] animate-fade-in flex-col items-center justify-center gap-8 py-10">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white shadow-glow">
          R
        </span>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Spinner size="sm" className="text-brand-500 dark:text-brand-400" />
          Loading RentEase…
        </div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
