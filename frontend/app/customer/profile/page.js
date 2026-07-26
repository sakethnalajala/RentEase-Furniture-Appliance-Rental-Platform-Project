'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Mail, Phone, Calendar, Camera, Pencil, Check, X, BadgeCheck, Sparkles,
  Heart, Package, CheckCircle2, MapPin, IndianRupee, Gift, KeyRound, User as UserIcon,
  ShoppingCart, Bell, Settings as SettingsIcon, Compass,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import { useGetMeQuery, useUpdateProfileMutation, useUploadUserImageMutation, useChangePasswordMutation } from '@/store/authApi';
import { useGetWishlistQuery, useListAddressesQuery } from '@/store/customerApi';
import { useListMyOrdersQuery } from '@/store/orderApi';

// Same lightweight requestAnimationFrame counter used on the Admin/Vendor profile pages — kept
// local rather than imported since neither of those extracted it into a shared component.
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
};

function StatCard({ icon: Icon, label, value, accent = 'brand', prefix = '', suffix = '', loading }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0);
  const display = Math.round(animated).toLocaleString('en-IN');

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

function SectionCard({ icon: Icon, title, children }) {
  return (
    <Card variant="glass" className="p-6">
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

// In-progress OrderItem states — anything that isn't yet returned/completed/cancelled counts as
// an "active rental" for the customer's own stat card.
const ACTIVE_STATUSES = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'active_rental', 'extension_requested', 'pickup_scheduled'];

// Premium "modern home furniture rentals" hero background — used whenever the customer hasn't
// uploaded their own cover image. Free-to-use Unsplash photo (standard license, no attribution
// required), verified by downloading and visually inspecting it before use.
const DEFAULT_CUSTOMER_COVER_IMAGE =
  'https://images.unsplash.com/photo-1759238136854-a43787126db7?q=75&w=1600&auto=format&fit=crop';

export default function CustomerProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const { data: wishlistData, isLoading: wishlistLoading } = useGetWishlistQuery();
  const { data: addressesData, isLoading: addressesLoading } = useListAddressesQuery();
  const { data: ordersData, isLoading: ordersLoading } = useListMyOrdersQuery();

  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateProfileMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadUserImageMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [coverImageFailed, setCoverImageFailed] = useState(false);

  const profile = meData?.data;

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' });
  }, [profile?.name, profile?.phone]);

  useEffect(() => {
    setCoverImageFailed(false);
  }, [profile?.coverImage]);

  const coverImageSrc = profile?.coverImage || DEFAULT_CUSTOMER_COVER_IMAGE;
  const wishlistCount = wishlistData?.data?.length || 0;
  const addressCount = addressesData?.data?.length || 0;
  const orders = useMemo(() => ordersData?.data || [], [ordersData]);

  // Every order's items, flattened once — the source for both the active/completed rental
  // counts and the total-spend figure below.
  const allItems = useMemo(() => orders.flatMap((o) => o.items || []), [orders]);
  const activeRentals = useMemo(() => allItems.filter((i) => ACTIVE_STATUSES.includes(i.status)).length, [allItems]);
  const completedRentals = useMemo(() => allItems.filter((i) => i.status === 'completed').length, [allItems]);
  const totalSpend = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.grandTotalDue || 0), 0),
    [orders]
  );
  // Reward points and membership tier are both deterministic functions of real spend — not a
  // fabricated stored counter — consistent with this app's "real data only" approach elsewhere
  // (e.g. the Admin profile's securityScore).
  const rewardPoints = Math.floor(totalSpend / 100);
  const membershipTier =
    totalSpend >= 50000 ? 'Platinum' : totalSpend >= 20000 ? 'Gold' : totalSpend >= 5000 ? 'Silver' : 'Bronze';

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

  if (meLoading && !profile) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* ================= PREMIUM HERO ================= */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="gradient-border-animated relative overflow-hidden rounded-3xl">
          <div className="relative h-40 w-full overflow-hidden sm:h-52">
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
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-brand-900 to-accent-900">
                <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 animate-blob rounded-full bg-brand-500/30 blur-3xl" />
                <div className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 animate-blob rounded-full bg-accent-500/30 blur-3xl [animation-delay:6s]" />
              </div>
            )}
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
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5">
              <div className="relative -mt-12 shrink-0">
                <span
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-glow dark:border-slate-900"
                  style={profile?.avatar ? { backgroundImage: `url(${profile.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {!profile?.avatar && (profile?.name?.[0]?.toUpperCase() || <UserIcon size={28} />)}
                </span>
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

              <div className="w-full min-w-0 pt-2 sm:w-auto sm:flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                    {profile?.name}
                  </h1>
                  <Badge variant="brand">
                    <Sparkles size={11} /> {membershipTier} Member
                  </Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Mail size={13} /> {profile?.email}
                  </span>
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {profile?.isEmailVerified && (
                    <Badge variant="success">
                      <BadgeCheck size={11} /> Verified Account
                    </Badge>
                  )}
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

      {/* ================= RENTAL STATISTICS ================= */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Rental statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Heart} label="Wishlist" value={wishlistCount} accent="rose" loading={wishlistLoading} />
          <StatCard icon={Package} label="Active Rentals" value={activeRentals} accent="brand" loading={ordersLoading} />
          <StatCard icon={CheckCircle2} label="Completed Rentals" value={completedRentals} accent="emerald" loading={ordersLoading} />
          <StatCard icon={MapPin} label="Saved Addresses" value={addressCount} accent="sky" loading={addressesLoading} />
          <StatCard icon={IndianRupee} label="Total Spending" value={totalSpend} accent="amber" prefix="₹" loading={ordersLoading} />
          <StatCard icon={Gift} label="Reward Points" value={rewardPoints} accent="violet" loading={ordersLoading} />
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
              <InfoRow
                icon={Calendar}
                label="Member since"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              />
            </div>
          </SectionCard>

          <SectionCard icon={ShieldCheck} title="Security">
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <InfoRow
                icon={ShieldCheck}
                label="Two-factor authentication"
                value={profile?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
              />
              <InfoRow icon={KeyRound} label="Password status" value={profile?.authProvider === 'google' ? 'Managed by Google' : 'Set'} />
            </div>

            {profile?.authProvider !== 'google' && (
              <>
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
              </>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={Sparkles} title="Quick actions">
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <ActionButton icon={Pencil} label="Edit Profile" onClick={() => setEditing(true)} />
              <ActionButton icon={Camera} label="Upload Avatar" onClick={() => avatarInputRef.current?.click()} loading={isUploadingImage} />
              <ActionButton icon={Compass} label="Browse" onClick={() => router.push('/customer/browse')} />
              <ActionButton icon={Heart} label="Wishlist" onClick={() => router.push('/customer/wishlist')} />
              <ActionButton icon={ShoppingCart} label="Cart" onClick={() => router.push('/customer/cart')} />
              <ActionButton icon={Package} label="My Rentals" onClick={() => router.push('/customer/rentals')} />
              <ActionButton icon={MapPin} label="Addresses" onClick={() => router.push('/customer/addresses')} />
              <ActionButton icon={Bell} label="Notifications" onClick={() => router.push('/customer/notifications')} />
              <ActionButton icon={SettingsIcon} label="Settings" onClick={() => router.push('/customer/settings')} />
            </div>
          </SectionCard>

          <SectionCard icon={Gift} title="Membership">
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Current tier</span>
                <span className="font-semibold text-slate-900 dark:text-white">{membershipTier}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Reward points</span>
                <span className="font-semibold text-slate-900 dark:text-white">{rewardPoints.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Lifetime spend</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currency(totalSpend)}</span>
              </div>
              <p className="border-t border-slate-200/70 pt-3 text-[11px] text-slate-400 dark:border-white/10">
                Earn 1 point for every ₹100 spent. Reach ₹5,000 for Silver, ₹20,000 for Gold, ₹50,000 for Platinum.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
