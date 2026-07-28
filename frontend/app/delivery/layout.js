'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  PackageSearch,
  Truck,
  History,
  Bell,
  MessageSquare,
  Wallet,
  BarChart3,
  UserCircle,
  Settings,
  Menu,
  X,
  MapPin,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CitySelector from '@/components/layout/CitySelector';
import UserInfoCard from '@/components/layout/UserInfoCard';
import BackButton from '@/components/ui/BackButton';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { useLogoutUserMutation, useLoginMutation, useListCitiesQuery, useSelectCityMutation } from '@/store/authApi';
import { useGetUnreadNotificationCountQuery } from '@/store/notificationApi';
import { useGetMyDeliveryProfileQuery } from '@/store/deliveryApi';
import { setSelectedCity } from '@/store/citySlice';
import { DELIVERY_PARTNER_BY_CITY } from '@/lib/demoAccounts';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const NAV_ITEMS = [
  { href: '/delivery', label: 'Dashboard', icon: Home, exact: true },
  { href: '/delivery/requests', label: 'Delivery Requests', icon: PackageSearch },
  { href: '/delivery/assigned', label: 'Assigned Deliveries', icon: Truck },
  { href: '/delivery/history', label: 'Delivery History', icon: History },
  { href: '/delivery/notifications', label: 'Notifications', icon: Bell },
  { href: '/delivery/messages', label: 'Messages', icon: MessageSquare },
  { href: '/delivery/earnings', label: 'Earnings', icon: Wallet },
  { href: '/delivery/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/delivery/profile', label: 'Profile', icon: UserCircle },
  { href: '/delivery/settings', label: 'Settings', icon: Settings },
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
  const { data: unread } = useGetUnreadNotificationCountQuery(undefined, { pollingInterval: LIVE_POLL_MS });
  const [logoutUser, { isLoading }] = useLogoutUserMutation();

  const unreadCount = unread?.data?.count || 0;

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-1 py-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium">
          R
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Rent<span className="text-gradient">Ease</span>
          <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-accent-500">
            Delivery
          </span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const badge = item.href === '/delivery/notifications' ? unreadCount : 0;
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

// A real delivery partner's account is permanently tied to the one city they registered in —
// there's no "browse another city" concept the way Customer/Vendor/Admin have, since a courier
// can't just teleport cities. The demo headline accounts (one per city, see seed.js's
// seedHeadlineDeliveryPartners) are the exception: switching the header city selector while
// logged into one of THOSE accounts signs into that city's own demo account instead, so every
// page in this portal — Dashboard/Analytics/Requests/Assigned/History/Notifications/Messages/
// Earnings/Profile — genuinely shows a different city's data, not just a relabeled filter.
function isDemoDeliveryEmail(email) {
  return Object.values(DELIVERY_PARTNER_BY_CITY).some((acc) => acc.email === email);
}

export default function DeliveryLayout({ children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { status, user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switchingCity, setSwitchingCity] = useState(false);
  const showBackButton = pathname !== '/delivery';
  const [demoLogin] = useLoginMutation();
  const [selectCity] = useSelectCityMutation();
  const isDemoAccount = isDemoDeliveryEmail(user?.email);
  const { data: profileData } = useGetMyDeliveryProfileQuery(undefined, { skip: isDemoAccount || status !== 'authenticated' });
  const { data: citiesData } = useListCitiesQuery(undefined, { skip: !isDemoAccount });
  const cities = citiesData?.data || [];
  const selectedCity = useSelector((state) => state.city.selectedCity);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && user?.role !== 'delivery_partner') router.replace('/');
  }, [status, user, router]);

  // The header city label must always reflect WHICH account is actually logged in, not whatever
  // city happens to be cached in localStorage/`user.selectedCity` from a previous session or a
  // different role in the same browser (that field is a general browsing filter shared across
  // roles, and can drift for reasons unrelated to this portal). For a demo account, the email
  // itself is the authoritative signal for its city; for a real account, DeliveryPartner.
  // assignedCity is. Correcting it here (and best-effort persisting it back) keeps the selector
  // honest every time the logged-in identity changes.
  //
  // Deliberately keyed ONLY on identity (user.email / assignedCity), never on `selectedCity`
  // itself: an earlier version also depended on selectedCity so it could compare against it,
  // which re-ran this effect the instant handleCityChange below optimistically set the NEW city
  // (before the re-login had resolved) — at that split second `user.email` still belonged to the
  // OLD account, so this effect saw a "mismatch" and immediately reverted the selection back to
  // the old city, fighting the switch and making it look like changing cities did nothing. Since
  // this effect only needs to run when the authenticated identity actually changes, and reads
  // the live `selectedCity` value via closure to decide whether a correction is even needed
  // (not as a re-trigger), that race can't happen anymore.
  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'delivery_partner') return;
    if (isDemoAccount) {
      const correctCityName = Object.entries(DELIVERY_PARTNER_BY_CITY).find(([, acc]) => acc.email === user.email)?.[0];
      if (!correctCityName || selectedCity?.name === correctCityName || !cities.length) return;
      const match = cities.find((c) => c.name === correctCityName);
      if (!match) return;
      dispatch(setSelectedCity({ id: match._id, name: match.name, state: match.state }));
      selectCity({ cityId: match._id }).unwrap().catch(() => {});
    } else if (profileData?.data?.assignedCity) {
      const ac = profileData.data.assignedCity;
      if (selectedCity?.id === ac._id) return;
      dispatch(setSelectedCity({ id: ac._id, name: ac.name, state: ac.state }));
      selectCity({ cityId: ac._id }).unwrap().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.email, isDemoAccount, cities.length, profileData?.data?.assignedCity?._id]);

  const handleCityChange = async (city) => {
    dispatch(setSelectedCity({ id: city._id, name: city.name, state: city.state }));

    const account = DELIVERY_PARTNER_BY_CITY[city.name];
    if (!account || account.email === user?.email) return; // no demo account for this city, or already it

    setSwitchingCity(true);
    try {
      const res = await demoLogin({ email: account.email, password: account.password, role: 'delivery_partner' }).unwrap();
      if (res.data?.user) {
        toast.success(`Switched to ${account.name} — ${city.name}'s delivery partner.`);
        router.replace('/delivery');
      } else {
        // Demo Admin-style 2FA challenge shouldn't happen for this role, but fail safe.
        toast.error('Could not switch city.');
      }
    } catch {
      toast.error("Could not switch to this city's delivery partner account.");
    } finally {
      setSwitchingCity(false);
    }
  };

  if (status !== 'authenticated' || user?.role !== 'delivery_partner') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const cityControl = isDemoAccount ? (
    <CitySelector onSelect={handleCityChange} />
  ) : (
    <span className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 py-2 pl-3 pr-3.5 text-sm font-medium text-slate-800 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white">
      <MapPin size={15} className="text-brand-500 dark:text-brand-300" />
      {profileData?.data?.assignedCity?.name || 'Your city'}
    </span>
  );

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
          <div className="flex items-center gap-2">
            {switchingCity && <Spinner size="sm" className="text-brand-500" />}
            {cityControl}
            <ThemeToggle />
          </div>
        </header>

        {showBackButton && (
          <div className="border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10 lg:hidden">
            <BackButton fallbackHref="/delivery" />
          </div>
        )}

        <div className="hidden items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-3 dark:border-white/10 lg:flex">
          <div>{showBackButton && <BackButton fallbackHref="/delivery" />}</div>
          <div className="flex items-center gap-3">
            {switchingCity && <Spinner size="sm" className="text-brand-500" />}
            {cityControl}
            <ThemeToggle />
          </div>
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
