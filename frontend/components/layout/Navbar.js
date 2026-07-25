'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CitySelector from './CitySelector';
import { useLogoutUserMutation } from '@/store/authApi';

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
        R
      </span>
      <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        Rent<span className="text-gradient">Ease</span>
      </span>
    </Link>
  );
}

function AuthActions({ onNavigate }) {
  const pathname = usePathname();
  const { user, status } = useSelector((state) => state.auth);
  const [logoutUser, { isLoading }] = useLogoutUserMutation();

  if (status === 'authenticated' && user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:inline">
          Hi, {user.name.split(' ')[0]}
        </span>
        <Button variant="ghost" size="sm" loading={isLoading} onClick={() => logoutUser()}>
          Log out
        </Button>
      </div>
    );
  }

  const isLoginActive = pathname === '/login';
  const isRegisterActive = pathname === '/register';

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" onClick={onNavigate}>
        {/* `secondary` is the glass-styled variant (translucent + blurred, matching the rest
            of this app's glassmorphism language) — previously `ghost` (plain, no container),
            which read as visually lighter-weight than Sign Up rather than its equal. Gains a
            soft glow + ring exactly when /login is the active route. */}
        <Button
          variant="secondary"
          size="sm"
          className={`transition-shadow duration-300 ${isLoginActive ? 'shadow-glow ring-1 ring-brand-400/60 dark:ring-brand-300/50' : ''}`}
        >
          Log in
        </Button>
      </Link>
      <Link href="/register" onClick={onNavigate}>
        <Button
          variant="primary"
          size="sm"
          className={`transition-shadow duration-300 ${isRegisterActive ? 'shadow-glow ring-1 ring-white/50' : ''}`}
        >
          Sign up
        </Button>
      </Link>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? 'glass-strong border-slate-200/70 shadow-premium dark:border-white/10'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-12">
        <Logo />

        <div className="hidden items-center gap-3 md:flex">
          <CitySelector />
          <ThemeToggle />
          <AuthActions />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileOpen ? 'x' : 'menu'}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-strong overflow-hidden border-t border-slate-200/70 dark:border-white/10 md:hidden"
          >
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
              <CitySelector className="w-full" />
              <AuthActions onNavigate={() => setMobileOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
