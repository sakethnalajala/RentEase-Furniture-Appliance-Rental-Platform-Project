'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

// Fully custom dropdown (not a native <select>) so the option list is themed by our own
// dark:/theme-glass:/theme-midnight: utilities instead of the OS-rendered native popup.
//
// The menu is rendered through a portal straight into <body>, positioned with `fixed`
// coordinates computed from the trigger's own bounding rect. Rendering it in place (as a
// normal absolutely-positioned child) looked fine until it sat inside a `.glass` ancestor —
// `backdrop-blur` creates a new stacking context, so the menu's z-index only ever won against
// its own siblings *within that Card*, never against a later Card/table lower on the page;
// whichever painted later in DOM order won regardless of z-index. Escaping to the body sidesteps
// that entirely, which is the same reason most component libraries (Radix, Headless UI) portal
// their popovers rather than trying to out-z-index their way past it.
export default function Select({ value, onChange, options, className = '', menuClassName = '' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null); // { top, left, width, openUp }
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const active = options.find((o) => o.value === value) || options[0];

  const computeCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 288; // matches max-h-72
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight;
    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: rect.width,
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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

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

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-900 backdrop-blur-sm transition-colors hover:border-slate-400 dark:border-white/15 dark:bg-white/[0.07] dark:text-white dark:hover:border-white/25"
      >
        <span className="truncate">{active?.label}</span>
        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
                  left: coords.left,
                  width: Math.max(coords.width, 176),
                }}
                className={`z-[9999] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/50 ${menuClassName}`}
              >
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      opt.value === value
                        ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                    {opt.value === value && <Check size={14} />}
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
