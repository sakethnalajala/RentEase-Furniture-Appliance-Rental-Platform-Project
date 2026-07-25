'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Gem, Waves, Check } from 'lucide-react';

// Four themes now need more than a single cycle-through button (that was fine for three taps,
// not four) — this is a small icon-trigger dropdown, portaled to <body> for the same reason
// Select.js is: a trigger living inside a `.glass` header (backdrop-blur creates its own
// stacking context) would otherwise render its menu behind whatever Card/section comes next
// in the DOM, regardless of z-index.
const THEMES = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'glass', label: 'Glass', icon: Gem },
  { key: 'midnight', label: 'Midnight Blue', icon: Waves },
];

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Avoids a hydration mismatch: the server can't know the user's stored theme preference.
  useEffect(() => setMounted(true), []);

  const current = THEMES.find((t) => t.key === theme) || THEMES[0];

  const computeCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight;
    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      right: window.innerWidth - rect.right,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computeCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleReposition = () => computeCoords();
    const handleKeyDown = (e) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!mounted) return <div className={`h-9 w-9 rounded-full ${className}`} />;

  const Icon = current.icon;

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Switch theme (currently ${current.label})`}
        title={current.label}
        className={`focus-ring relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 ${className}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current.key}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            <Icon size={17} />
          </motion.span>
        </AnimatePresence>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed',
                  top: coords.openUp ? undefined : coords.top,
                  bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
                  right: coords.right,
                }}
                className="z-[9999] w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/50"
              >
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTheme(t.key);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      t.key === current.key
                        ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <t.icon size={16} className="shrink-0" />
                    <span className="flex-1">{t.label}</span>
                    {t.key === current.key && <Check size={14} className="shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
