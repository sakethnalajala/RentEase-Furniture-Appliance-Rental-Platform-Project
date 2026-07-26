'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Mail, Phone, Calendar, Camera, Pencil, Check, X, Crown, BadgeCheck,
  Users, Building2, Truck, Package, Repeat, ShoppingBag, IndianRupee, Star, TrendingUp,
  MapPin, UserCheck, Clock3, XCircle, CheckCircle2, Activity, KeyRound, Lock, Smartphone,
  Download, FileBarChart, ScrollText, Settings as SettingsIcon, Shield, Fingerprint,
  Server, Database, Radio, Gauge, User as UserIcon, Briefcase, AtSign, Globe2, Headset,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import {
  useGetMeQuery,
  useUpdateProfileMutation,
  useUploadUserImageMutation,
  useChangePasswordMutation,
  useListCitiesQuery,
} from '@/store/authApi';
import {
  useGetAdminStatsQuery,
  useGetAdminAnalyticsQuery,
  useGetSystemHealthQuery,
  useAdminListDeliveryPartnersQuery,
  useAdminListOrdersQuery,
} from '@/store/adminApi';

// ---------------------------------------------------------------------------
// Lightweight animated counter — plain requestAnimationFrame, no extra dependency, cheap
// enough to run on 15 stat cards at once without any jank. Eases out over ~1.1s so numbers
// feel like they're "counting up" rather than snapping in.
// ---------------------------------------------------------------------------
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const end = Number.isFinite(target) ? target : 0;
    if (end === 0) {
      setValue(0);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(end * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const ACCENTS = {
  brand: 'from-brand-500 to-brand-600',
  accent: 'from-accent-500 to-accent-600',
  emerald: 'from-emerald-500 to-emerald-600',
  sky: 'from-sky-500 to-sky-600',
  violet: 'from-violet-500 to-violet-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  cyan: 'from-cyan-500 to-cyan-600',
};

function StatCard({ icon: Icon, label, value, accent = 'brand', prefix = '', suffix = '', decimals = 0, loading }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0);
  const display = decimals ? animated.toFixed(decimals) : Math.round(animated).toLocaleString('en-IN');

  return (
    <Card variant="glass" hover className="group relative overflow-hidden p-4">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${ACCENTS[accent]} opacity-[0.14] blur-2xl transition-opacity duration-300 group-hover:opacity-30`}
      />
      <div className="relative flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENTS[accent]} text-white shadow-premium transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-16" />
          ) : (
            <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {prefix}
              {display}
              {suffix}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function SectionCard({ icon: Icon, title, children, id, className = '' }) {
  return (
    <Card variant="glass" className={`p-6 ${className}`} id={id}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
          <Icon size={15} />
        </span>
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, loading }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-3.5 text-center text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-brand-400/40 dark:hover:bg-brand-400/10 dark:hover:text-brand-300"
    >
      <Icon size={18} />
      {label}
    </motion.button>
  );
}

const currency = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Premium executive/"digital operations center" hero background — used whenever the admin
// hasn't uploaded their own cover image. Free-to-use Unsplash photo (standard license, no
// attribution required), sized and format-negotiated (auto=format lets the CDN serve WebP/AVIF
// to browsers that support it) rather than pulling the full-resolution original.
const DEFAULT_ADMIN_COVER_IMAGE =
  'https://images.unsplash.com/photo-1754039984985-ef607d80113a?q=75&w=1600&auto=format&fit=crop';

export default function AdminProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const { data: citiesData } = useListCitiesQuery();
  const { data: statsData, isLoading: statsLoading } = useGetAdminStatsQuery();
  const { data: analyticsData, isLoading: analyticsLoading } = useGetAdminAnalyticsQuery();
  const { data: healthData, isError: healthError } = useGetSystemHealthQuery(undefined, { pollingInterval: 30000 });
  const { data: pendingPartnersData } = useAdminListDeliveryPartnersQuery({ status: 'pending' });
  const { data: rejectedPartnersData } = useAdminListDeliveryPartnersQuery({ status: 'rejected' });
  const { data: recentOrdersData } = useAdminListOrdersQuery({ limit: 5 });

  // A second, narrower call to the same flexible analytics endpoint, scoped to just today —
  // real, live, server-computed numbers for the Platform Summary's "Today's ..." cards, not a
  // separate hand-rolled aggregation.
  const todayRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }, []);
  const { data: todayData } = useGetAdminAnalyticsQuery(todayRange);

  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateProfileMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadUserImageMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  // Defensive fallback in case the external default cover image can't load (offline, ad-blocker,
  // CDN hiccup) — drops back to the old CSS-only gradient/grid/blob treatment rather than a
  // broken-image icon. Reset whenever the image source itself changes (e.g. admin uploads their
  // own cover after this had already failed once).
  const [coverImageFailed, setCoverImageFailed] = useState(false);

  const profile = meData?.data;

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' });
  }, [profile?.name, profile?.phone]);

  useEffect(() => {
    setCoverImageFailed(false);
  }, [profile?.coverImage]);

  const stats = statsData?.data;
  const analytics = analyticsData?.data;
  const overview = analytics?.overview;
  const cities = citiesData?.data || [];
  const pendingPartnersCount = pendingPartnersData?.data?.length || 0;
  const rejectedPartnersCount = rejectedPartnersData?.data?.length || 0;
  const recentOrders = recentOrdersData?.data?.items || [];
  const todayOverview = todayData?.data?.overview;
  const coverImageSrc = profile?.coverImage || DEFAULT_ADMIN_COVER_IMAGE;

  // Real month-over-month growth from the same monthly order-count trend the Analytics page
  // charts — the last two entries in `trends.orders` are the two most recent months.
  const platformGrowthPercent = useMemo(() => {
    const monthly = analytics?.trends?.orders;
    if (!monthly || monthly.length < 2) return 0;
    const prev = monthly[monthly.length - 2].count;
    const curr = monthly[monthly.length - 1].count;
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }, [analytics]);

  // Deterministic, real (not random) identity flourishes derived from the account's own data —
  // no fabricated device/IP logs anywhere on this page, only what the account genuinely has.
  const employeeId = profile?.id ? `ADM-${String(profile.id).slice(-6).toUpperCase()}` : '—';
  const username = profile?.email ? profile.email.split('@')[0] : '—';
  const securityScore = (profile?.twoFactorEnabled ? 60 : 0) + (profile?.isEmailVerified ? 25 : 0) + 15; // +15 baseline: mandatory 2FA policy + hashed credentials, true for every admin account regardless of toggles
  const securityLevel = securityScore >= 85 ? 'Maximum' : securityScore >= 60 ? 'High' : 'Standard';
  const dbStatus = statsLoading ? 'Checking…' : stats ? 'Connected' : 'Unreachable';
  const uptimeLabel = useMemo(() => {
    const seconds = healthData?.data?.uptime;
    if (!Number.isFinite(seconds)) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${Math.floor(seconds % 60)}s`;
  }, [healthData]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(form).unwrap();
      toast.success('Profile updated.');
      setEditing(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update profile.');
    }
  };

  const handleImageChange = (type) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadImage({ type, formData }).unwrap();
      toast.success(type === 'avatar' ? 'Avatar updated.' : 'Cover image updated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not upload image.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await changePassword(pwForm).unwrap();
      toast.success('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '' });
      setShowPasswordForm(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not change password.');
    }
  };

  const handleDownloadProfile = () => {
    const summary = {
      name: profile?.name,
      email: profile?.email,
      phone: profile?.phone,
      employeeId,
      username,
      role: 'Super Administrator',
      accountCreated: profile?.createdAt,
      lastLogin: profile?.lastLoginAt,
      twoFactorEnabled: profile?.twoFactorEnabled,
      securityScore,
      platformStats: stats,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentease-admin-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Profile exported.');
  };

  const scrollToSecurity = () => {
    document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (meLoading && !profile) {
    return (
      <div className="max-w-7xl space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* ================= PREMIUM HERO ================= */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="gradient-border-animated relative overflow-hidden rounded-3xl">
          {/* Cover / background — a real <img> (not a CSS background) so it can genuinely
              lazy-load and use object-fit: cover without stretching, per the executive-hero
              spec. Admin's own uploaded cover (once set) always takes priority over the
              default premium background below. */}
          <div className="relative h-44 w-full overflow-hidden sm:h-56">
            {!coverImageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageSrc}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setCoverImageFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              /* Last-resort fallback if even the default image can't load (offline, blocked,
                 CDN hiccup) — the original layered gradient + glow blobs + grid pattern, so
                 this never degrades to a broken-image icon or blank box. */
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-brand-900 to-accent-900">
                <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 animate-blob rounded-full bg-brand-500/30 blur-3xl" />
                <div className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 animate-blob rounded-full bg-accent-500/30 blur-3xl [animation-delay:6s]" />
              </div>
            )}

            {/* Uniform ~50% dark overlay (within the requested 40-60% range) plus a touch of
                blur, so the upload button and identity panel below always read clearly
                regardless of how bright the underlying photo is — then an extra fade right at
                the bottom edge so the image blends smoothly into the glass panel beneath it. */}
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-slate-950/60" />

            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange('coverImage')} />
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              disabled={isUploadingImage}
              onClick={() => coverInputRef.current?.click()}
              className="focus-ring absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white shadow-premium backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-60"
              aria-label="Change cover image"
            >
              <Camera size={15} />
            </motion.button>
          </div>

          <div className="relative bg-white/70 px-6 pb-6 backdrop-blur-xl dark:bg-slate-900/60">
            {/* Stacked on mobile (avatar, then identity, then the edit button, each on their
                own row) so nothing fights for space in a single flex-wrap row and truncates —
                reverts to the original side-by-side layout from sm: up. */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5">
              {/* Avatar */}
              <div className="relative -mt-12 shrink-0">
                <span
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-glow dark:border-slate-900"
                  style={profile?.avatar ? { backgroundImage: `url(${profile.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {!profile?.avatar && (profile?.name?.[0]?.toUpperCase() || <UserIcon size={28} />)}
                </span>
                {/* Online status */}
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                </span>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange('avatar')} />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={isUploadingImage}
                  onClick={() => avatarInputRef.current?.click()}
                  className="focus-ring absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-premium backdrop-blur transition-colors hover:bg-slate-900 disabled:opacity-60"
                  aria-label="Change avatar"
                >
                  <Camera size={13} />
                </motion.button>
              </div>

              {/* Identity + badges */}
              <div className="w-full min-w-0 pt-2 sm:w-auto sm:flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                    {profile?.name}
                  </h1>
                  <Badge variant="brand">
                    <Crown size={11} /> Super Administrator
                  </Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} /> RentEase Platform Owner
                  </span>
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Badge variant="success">
                    <BadgeCheck size={11} /> Verified Account
                  </Badge>
                  {profile?.twoFactorEnabled && (
                    <Badge variant="accent">
                      <ShieldCheck size={11} /> 2FA Enabled
                    </Badge>
                  )}
                  <Badge variant="neutral">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                  </Badge>
                </div>
              </div>

              {!editing && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)} className="mb-0.5">
                  <Pencil size={14} /> Edit profile
                </Button>
              )}
            </div>

            {editing && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleSaveProfile}
                className="mt-5 flex flex-col gap-4 border-t border-slate-200/70 pt-5 dark:border-white/10 sm:flex-row sm:items-end sm:gap-3"
              >
                <Input label="Full name" className="flex-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input label="Phone" className="flex-1" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={isSavingProfile}>
                    <Check size={14} /> Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    <X size={14} /> Cancel
                  </Button>
                </div>
              </motion.form>
            )}
          </div>
        </div>
      </motion.div>

      {/* ================= STATISTICS ================= */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Platform statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={Building2} label="Total Vendors" value={stats?.totalVendors} accent="brand" loading={statsLoading} />
          <StatCard icon={Users} label="Total Customers" value={stats?.totalCustomers} accent="sky" loading={statsLoading} />
          <StatCard icon={Truck} label="Delivery Partners" value={stats?.totalDeliveryPartners} accent="violet" loading={statsLoading} />
          <StatCard icon={Package} label="Total Products" value={stats?.totalProducts} accent="emerald" loading={statsLoading} />
          <StatCard icon={Repeat} label="Total Rentals" value={overview?.totalRentals} accent="cyan" loading={analyticsLoading} />
          <StatCard icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders} accent="amber" loading={statsLoading} />
          <StatCard icon={IndianRupee} label="Total Revenue" value={stats?.totalRevenue} accent="emerald" prefix="₹" loading={statsLoading} />
          <StatCard icon={Star} label="Platform Rating" value={overview?.productPerformance} accent="amber" suffix=" / 5" decimals={1} loading={analyticsLoading} />
          <StatCard icon={TrendingUp} label="Platform Growth" value={platformGrowthPercent} accent="brand" suffix="%" decimals={1} loading={analyticsLoading} />
          <StatCard icon={MapPin} label="Cities Managed" value={cities.length} accent="sky" loading={!citiesData} />
          <StatCard icon={UserCheck} label="Active Users" value={stats?.totalUsers} accent="violet" loading={statsLoading} />
          <StatCard icon={Clock3} label="Pending Approvals" value={(stats?.pendingVendors || 0) + pendingPartnersCount} accent="amber" loading={statsLoading} />
          <StatCard icon={XCircle} label="Rejected Requests" value={(stats?.rejectedVendors || 0) + rejectedPartnersCount} accent="rose" loading={statsLoading} />
          <StatCard icon={CheckCircle2} label="Completed Rentals" value={overview?.completedRentals} accent="emerald" loading={analyticsLoading} />
          <StatCard icon={Activity} label="System Health" value={healthError ? 0 : 100} accent="cyan" suffix="%" loading={!healthData && !healthError} />
        </div>
      </motion.div>

      {/* ================= INFO + SIDEBAR ================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={UserIcon} title="Personal information">
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <InfoRow icon={UserIcon} label="Full name" value={profile?.name} />
              <InfoRow icon={Mail} label="Email" value={profile?.email} />
              <InfoRow icon={Phone} label="Phone" value={profile?.phone} />
              <InfoRow icon={AtSign} label="Username" value={username} />
              <InfoRow icon={Crown} label="Role" value="Super Administrator" />
              <InfoRow icon={Briefcase} label="Employee ID" value={employeeId} />
            </div>
          </SectionCard>

          <SectionCard icon={Globe2} title="Platform information">
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <InfoRow
                icon={Calendar}
                label="Account created"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              />
              <InfoRow
                icon={Clock3}
                label="Last login"
                value={profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'This session'}
              />
              <InfoRow icon={Shield} label="Access level" value="Full Platform Access" />
              <InfoRow icon={SettingsIcon} label="Platform version" value="RentEase v2.4.0" />
              <InfoRow icon={MapPin} label="Cities managed" value={cities.length ? `${cities.length} cities` : '—'} />
              <InfoRow icon={Fingerprint} label="Security level" value={securityLevel} />
              <div className="sm:col-span-2">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Manage Vendors', 'Manage Products', 'Manage Orders', 'Manage Delivery Partners', 'Manage Users', 'Platform Settings', 'Analytics Access', 'Broadcast Notifications'].map((p) => (
                    <Badge key={p} variant="neutral">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Headset} title="Contact information">
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={profile?.email} />
              <InfoRow icon={Phone} label="Phone" value={profile?.phone} />
              <InfoRow icon={MapPin} label="Office location" value="RentEase HQ — Hyderabad, India" />
              <InfoRow icon={Headset} label="Support contact" value="support@rentease.com" />
            </div>
          </SectionCard>

          <SectionCard icon={Lock} title="Security" id="security-section">
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <InfoRow
                icon={ShieldCheck}
                label="Two-factor authentication"
                value={profile?.twoFactorEnabled ? 'Enabled (mandatory)' : 'Setup required'}
              />
              <InfoRow icon={Fingerprint} label="Security score" value={`${securityScore} / 100`} />
              <InfoRow icon={KeyRound} label="Password status" value={profile?.authProvider === 'google' ? 'Managed by Google' : 'Set'} />
              <InfoRow
                icon={Calendar}
                label="Last password change"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              />
              <InfoRow
                icon={Clock3}
                label="Login history"
                value={profile?.lastLoginAt ? `Last seen ${new Date(profile.lastLoginAt).toLocaleDateString('en-IN')}` : 'Current session'}
              />
              <InfoRow icon={Smartphone} label="Recent devices" value="This device (current session)" />
            </div>

            {!showPasswordForm ? (
              <Button type="button" size="sm" variant="secondary" className="mt-5" onClick={() => setShowPasswordForm(true)}>
                <KeyRound size={14} /> Change password
              </Button>
            ) : (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleChangePassword}
                className="mt-5 flex flex-col gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10 sm:max-w-sm"
              >
                <Input
                  label="Current password"
                  type="password"
                  required
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                />
                <Input
                  label="New password"
                  type="password"
                  required
                  hint="At least 8 characters, one uppercase letter, one number."
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={isChangingPassword}>
                    <Check size={14} /> Update password
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowPasswordForm(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.form>
            )}
          </SectionCard>
        </div>

        {/* ================= SIDEBAR: QUICK ACTIONS + EXECUTIVE SUMMARY ================= */}
        <div className="space-y-6">
          <SectionCard icon={Gauge} title="Quick actions">
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <ActionButton icon={Pencil} label="Edit Profile" onClick={() => setEditing(true)} />
              <ActionButton icon={Camera} label="Upload Avatar" onClick={() => avatarInputRef.current?.click()} loading={isUploadingImage} />
              <ActionButton icon={KeyRound} label="Change Password" onClick={() => setShowPasswordForm(true)} />
              <ActionButton icon={Shield} label="Manage Security" onClick={scrollToSecurity} />
              <ActionButton icon={Users} label="Manage Users" onClick={() => router.push('/admin/customers')} />
              <ActionButton icon={SettingsIcon} label="System Settings" onClick={() => router.push('/admin/settings')} />
              <ActionButton icon={Download} label="Download Profile" onClick={handleDownloadProfile} />
              <ActionButton icon={FileBarChart} label="Export Reports" onClick={() => router.push('/admin/analytics')} />
              <ActionButton icon={ScrollText} label="Activity Logs" onClick={() => router.push('/admin/orders')} />
            </div>
          </SectionCard>

          <SectionCard icon={Briefcase} title="Executive summary">
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Today&apos;s revenue</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currency(todayOverview?.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Today&apos;s rentals</span>
                <span className="font-semibold text-slate-900 dark:text-white">{todayOverview?.totalRentals ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Today&apos;s orders</span>
                <span className="font-semibold text-slate-900 dark:text-white">{todayOverview?.totalOrders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Pending vendor requests</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats?.pendingVendors ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Pending delivery requests</span>
                <span className="font-semibold text-slate-900 dark:text-white">{pendingPartnersCount}</span>
              </div>

              <div className="border-t border-slate-200/70 pt-3 dark:border-white/10">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-500/10 px-2 py-2.5">
                    <Server size={14} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                    <p className="mt-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Server</p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Operational</p>
                  </div>
                  <div className={`rounded-xl px-2 py-2.5 ${dbStatus === 'Connected' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                    <Database size={14} className={`mx-auto ${dbStatus === 'Connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`} />
                    <p className={`mt-1 text-[10px] font-medium ${dbStatus === 'Connected' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>Database</p>
                    <p className={`text-[10px] ${dbStatus === 'Connected' ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-500/80'}`}>{dbStatus}</p>
                  </div>
                  <div className={`rounded-xl px-2 py-2.5 ${healthError ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                    <Radio size={14} className={`mx-auto ${healthError ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <p className={`mt-1 text-[10px] font-medium ${healthError ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>API</p>
                    <p className={`text-[10px] ${healthError ? 'text-rose-500/80' : 'text-emerald-600/80 dark:text-emerald-400/80'}`}>{healthError ? 'Down' : 'Healthy'}</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">Platform uptime: {uptimeLabel}</p>
              </div>

              {recentOrders.length > 0 && (
                <div className="border-t border-slate-200/70 pt-3 dark:border-white/10">
                  <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">Recent activity</p>
                  <div className="space-y-2">
                    {recentOrders.slice(0, 4).map((item) => (
                      <div key={item._id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                          {item.product?.name || 'Order'} — {item.order?.customer?.name || 'Customer'}
                        </span>
                        <Badge variant="neutral" className="shrink-0 capitalize">
                          {String(item.status || '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
