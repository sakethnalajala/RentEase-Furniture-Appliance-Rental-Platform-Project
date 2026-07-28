'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Heart, ShoppingCart, Package, Bell, MapPin, User, Settings, Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CitySelector from '@/components/layout/CitySelector';
import UserInfoCard from '@/components/layout/UserInfoCard';
import BackButton from '@/components/ui/BackButton';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { useLogoutUserMutation } from '@/store/authApi';
import { useGetCartQuery, useGetWishlistQuery } from '@/store/customerApi';
import { useGetUnreadNotificationCountQuery } from '@/store/notificationApi';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const NAV_ITEMS = [
  { href: '/customer', label: 'Dashboard', icon: Home, exact: true },
  { href: '/customer/browse', label: 'Browse', icon: Search },
  { href: '/customer/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/customer/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/customer/rentals', label: 'Rentals', icon: Package },
  { href: '/customer/notifications', label: 'Notifications', icon: Bell },
  { href: '/customer/addresses', label: 'Addresses', icon: MapPin },
  { href: '/customer/profile', label: 'Profile', icon: User },
  { href: '/customer/settings', label: 'Settings', icon: Settings },
];

function NavLink({ item, active, onNavigate, badge }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-premium'
          : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
      }`}
    >
      <item.icon size={17} />
      {item.label}
      {badge > 0 && (
        <span
          className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
            active ? 'bg-white/25 text-white' : 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ onNavigate }) {
  const pathname = usePathname();
  const { data: cart } = useGetCartQuery();
  const { data: wishlist } = useGetWishlistQuery();
  const { data: unread } = useGetUnreadNotificationCountQuery(undefined, { pollingInterval: LIVE_POLL_MS });
  const [logoutUser, { isLoading }] = useLogoutUserMutation();

  const cartCount = cart?.data?.items?.length || 0;
  const wishlistCount = wishlist?.data?.length || 0;
  const unreadCount = unread?.data?.count || 0;

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-1 py-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium">
          R
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Rent<span className="text-gradient">Ease</span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const badge =
            item.href === '/customer/cart'
              ? cartCount
              : item.href === '/customer/wishlist'
                ? wishlistCount
                : item.href === '/customer/notifications'
                  ? unreadCount
                  : 0;
          return <NavLink key={item.href} item={item} active={active} onNavigate={onNavigate} badge={badge} />;
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <UserInfoCard />
        <Button variant="ghost" size="sm" loading={isLoading} onClick={() => logoutUser()} className="w-full justify-start">
          Log out
        </Button>
      </div>
    </div>
  );
}

export default function CustomerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showBackButton = pathname !== '/customer';

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && user?.role !== 'customer') router.replace('/');
  }, [status, user, router]);

  if (status !== 'authenticated' || user?.role !== 'customer') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] lg:gap-4">
      {/* Desktop sidebar — inset from the viewport edge with its own rounded border so it reads
          as a distinct floating panel rather than a bar docked flush to the screen edge. */}
      <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] w-64 flex-shrink-0 flex-col rounded-2xl border p-5 lg:ml-4 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-strong sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 dark:border-white/10"
          >
            <Menu size={18} />
          </button>
          <Link href="/" className="text-base font-bold text-slate-900 dark:text-white">
            Rent<span className="text-gradient">Ease</span>
          </Link>
          <ThemeToggle />
        </header>

        {/* Always shown on mobile/tablet (not gated behind the back button) so the city
            selector — previously only reachable on large desktop screens — is always visible
            and reachable regardless of viewport size. */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10 lg:hidden">
          {showBackButton ? <BackButton fallbackHref="/customer" /> : <span />}
          <CitySelector />
        </div>

        <div className="hidden items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-3 dark:border-white/10 lg:flex">
          <div className="flex items-center gap-3">
            {showBackButton && <BackButton fallbackHref="/customer" />}
            <CitySelector />
          </div>
          <ThemeToggle />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="glass-strong relative h-full w-72 border-r p-5"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="focus-ring absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 dark:border-white/10"
              >
                <X size={16} />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
