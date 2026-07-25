'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { setSelectedCity } from '@/store/citySlice';
import { useListCitiesQuery, useSelectCityMutation } from '@/store/authApi';
import Skeleton from '@/components/ui/Skeleton';

// Custom dropdown instead of a native <select>: browsers render the open <option> list with
// OS-level colors that Tailwind's dark: classes can't reliably override, which is exactly
// why city names used to be unreadable in dark mode. Full control here fixes that for good.
//
// Portaled to <body> for the same reason as Select.js / ThemeToggle.js: this trigger lives
// inside the sticky Navbar, which gets `.glass-strong` (backdrop-blur) once the page scrolls —
// backdrop-blur creates a new stacking context, so a plain absolutely-positioned menu here would
// only ever out-z-index its own siblings inside the header, never the page content painted
// below it. Escaping to the body via a portal, positioned from the trigger's live bounding rect,
// sidesteps that entirely.
export default function CitySelector({ className = '', onSelect: onSelectOverride }) {
  const dispatch = useDispatch();
  const { data, isLoading } = useListCitiesQuery();
  const [selectCity] = useSelectCityMutation();
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const user = useSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const cities = data?.data || [];

  const computeCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight;
    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 208),
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

  const handleSelect = async (city) => {
    setOpen(false);

    // Delivery Partner layout passes this: a real delivery partner's account is permanently tied
    // to one city (there's no "browse another city" concept for them the way Customer/Vendor/
    // Admin have), so switching cities there means switching to that city's own demo account
    // instead of just changing a client-side filter — see delivery/layout.js's handleCityChange.
    if (onSelectOverride) {
      onSelectOverride(city);
      return;
    }

    dispatch(setSelectedCity({ id: city._id, name: city.name, state: city.state }));

    if (user) {
      try {
        await selectCity({ cityId: city._id }).unwrap();
      } catch {
        // non-fatal — the local selection still applies for browsing
      }
    }
  };

  if (isLoading) return <Skeleton className={`h-9 w-36 rounded-full ${className}`} />;

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="focus-ring flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 py-2 pl-3 pr-2.5 text-sm font-medium text-slate-800 backdrop-blur transition-colors hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        <MapPin size={15} className="text-brand-500 dark:text-brand-300" />
        <span className="max-w-[7rem] truncate">{selectedCity?.name || 'Select city'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform dark:text-slate-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <motion.ul
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
                  width: coords.width,
                }}
                role="listbox"
                aria-label="Select city"
                className="z-[9999] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/50"
              >
                {cities.map((city) => {
                  const isSelected = selectedCity?.id === city._id;
                  return (
                    <li key={city._id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(city)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <span>
                          {city.name}
                          <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-400">{city.state}</span>
                        </span>
                        {isSelected && <Check size={15} className="shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
