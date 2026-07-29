'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Truck, Bike, Car, Star, Phone, Mail, MapPin, ArrowLeft, Package, ImageOff, CalendarClock,
  PackageSearch, Zap, Wallet, CheckCircle2, XCircle, PauseCircle, RotateCcw,
  AlertTriangle, Navigation, Clock, Ban, Route, Pencil, Trash2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import {
  useAdminGetDeliveryPartnerQuery,
  useApproveDeliveryPartnerMutation,
  useRejectDeliveryPartnerMutation,
  useSuspendDeliveryPartnerMutation,
  useReactivateDeliveryPartnerMutation,
  useAdminDeleteDeliveryPartnerMutation,
} from '@/store/adminApi';
import EditDeliveryPartnerModal from '@/components/admin/EditDeliveryPartnerModal';
import { CountUpNumber } from '@/components/vendor/AnalyticsCharts';
import { initials, statusLabel, formatDate, money } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const STATUS_BADGE = { pending: 'neutral', approved: 'success', rejected: 'accent', suspended: 'accent' };

const VEHICLE_ICONS = { bike: Bike, van: Car, truck: Truck };

function StatTile({ icon: Icon, label, value, prefix = '', suffix = '', decimals = 0, accent, fallback }) {
  return (
    <Card variant="glass" className="p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={16} />
      </div>
      <p className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
        {fallback !== undefined ? fallback : <CountUpNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

function StarRow({ rating, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/20'}
        />
      ))}
    </div>
  );
}

function OnlinePill({ isOnline }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isOnline
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

function AvailabilityPill({ isAvailable }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isAvailable
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-brand-500' : 'bg-amber-500'}`} />
      {isAvailable ? 'Available' : 'Busy'}
    </span>
  );
}

export default function AdminDeliveryPartnerDetailPage() {
  const { partnerId } = useParams();
  const router = useRouter();
  const { data, isLoading } = useAdminGetDeliveryPartnerQuery(partnerId, { pollingInterval: LIVE_POLL_MS });
  const [approvePartner, { isLoading: isApproving }] = useApproveDeliveryPartnerMutation();
  const [rejectPartner, { isLoading: isRejecting }] = useRejectDeliveryPartnerMutation();
  const [suspendPartner, { isLoading: isSuspending }] = useSuspendDeliveryPartnerMutation();
  const [reactivatePartner, { isLoading: isReactivating }] = useReactivateDeliveryPartnerMutation();
  const [deletePartner, { isLoading: isDeleting }] = useAdminDeleteDeliveryPartnerMutation();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reason, setReason] = useState('');

  const partner = data?.data?.partner;
  const recentDeliveries = data?.data?.recentDeliveries || [];
  // completedDeliveries/activeDeliveries/pendingDeliveries/cancelledDeliveries/complaintsCount
  // (and the rating recomputed from actual delivery ratings) are siblings of `partner` in this
  // response, not fields on the partner document itself — see admin.controller.js
  // adminGetDeliveryPartner. averageRating/totalDeliveries fall back to the partner doc's own
  // fields since those two are genuinely persisted there too.
  const completedDeliveries = data?.data?.completedDeliveries ?? partner?.totalDeliveries ?? 0;
  const activeDeliveries = data?.data?.activeDeliveries || 0;
  const pendingDeliveries = data?.data?.pendingDeliveries || 0;
  const cancelledDeliveries = data?.data?.cancelledDeliveries || 0;
  const complaintsCount = data?.data?.complaintsCount || 0;
  const averageRating = data?.data?.averageRating ?? partner?.averageRating ?? 0;
  const totalEarnings = data?.data?.totalEarnings ?? 0;

  const handleApprove = async () => {
    try {
      await approvePartner(partnerId).unwrap();
      toast.success('Delivery partner approved.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not approve delivery partner.');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await rejectPartner({ id: partnerId, reason }).unwrap();
      toast.success('Delivery partner application rejected.');
      setRejectModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reject delivery partner.');
    }
  };

  const handleSuspend = async () => {
    try {
      await suspendPartner(partnerId).unwrap();
      toast.success('Delivery partner suspended.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not suspend delivery partner.');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivatePartner(partnerId).unwrap();
      toast.success('Delivery partner reactivated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reactivate delivery partner.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${partner?.user?.name}"? This cannot be undone.`)) return;
    try {
      await deletePartner(partnerId).unwrap();
      toast.success('Delivery partner deleted.');
      router.push('/admin/delivery-partners');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not delete delivery partner.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (!partner) {
    return (
      <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
        <Truck size={32} className="text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">This delivery partner isn&apos;t available anymore.</p>
        <Link
          href="/admin/delivery-partners"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          <ArrowLeft size={14} /> Back to Delivery Partners
        </Link>
      </Card>
    );
  }

  const avatarSrc = partner.user?.avatar || partner.profilePhoto;
  const VehicleIcon = VEHICLE_ICONS[partner.vehicleType] || Truck;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/delivery-partners"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowLeft size={15} /> Back to Delivery Partners
      </Link>

      {/* Profile header */}
      <Card variant="glass" className="flex flex-wrap items-start gap-5 p-6">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt={partner.user?.name} className="h-20 w-20 shrink-0 rounded-full object-cover shadow-premium" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-premium">
            {initials(partner.user?.name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{partner.user?.name}</h1>
            <Badge variant={STATUS_BADGE[partner.status || 'approved']}>{partner.status || 'approved'}</Badge>
            <OnlinePill isOnline={partner.isOnline} />
            <AvailabilityPill isAvailable={partner.isAvailable} />
            {partner.user?.isActive === false && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                Account disabled
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Phone size={13} /> {partner.user?.phone || '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail size={13} /> {partner.user?.email}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {partner.assignedCity?.name}
              {partner.assignedCity?.state ? `, ${partner.assignedCity.state}` : ''}
              {` · ${partner.area || 'Area not set'}`}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <VehicleIcon size={13} /> {partner.vehicleType} · {partner.vehicleNumber}
            </span>
          </div>
          {partner.createdAt && <p className="mt-1.5 text-xs text-slate-400">Partner since {formatDate(partner.createdAt)}</p>}

          {partner.status === 'rejected' && partner.rejectionReason && (
            <div className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
              <strong>Rejection reason:</strong> {partner.rejectionReason}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {(partner.status || 'approved') === 'pending' && (
              <>
                <Button size="sm" loading={isApproving} onClick={handleApprove}>
                  <CheckCircle2 size={15} /> Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setRejectModalOpen(true)}>
                  <XCircle size={15} /> Reject
                </Button>
              </>
            )}
            {partner.status === 'approved' && (
              <Button size="sm" variant="danger" loading={isSuspending} onClick={handleSuspend}>
                <PauseCircle size={15} /> Suspend
              </Button>
            )}
            {(partner.status === 'suspended' || partner.status === 'rejected') && (
              <Button size="sm" variant="secondary" loading={isReactivating} onClick={handleReactivate}>
                <RotateCcw size={15} /> Reactivate
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditModalOpen(true)}>
              <Pencil size={15} /> Edit
            </Button>
            <Button size="sm" variant="danger" loading={isDeleting} onClick={handleDelete}>
              <Trash2 size={15} /> Delete
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StarRow rating={averageRating} size={18} />
          <p className="text-xs text-slate-400">{partner.totalDeliveries || 0} total deliveries</p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile icon={Package} label="Completed deliveries" value={completedDeliveries} accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
        <StatTile icon={Zap} label="Active deliveries" value={activeDeliveries} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <StatTile icon={Wallet} label="Earnings" value={totalEarnings} prefix="₹" accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatTile icon={Clock} label="Pending deliveries" value={pendingDeliveries} accent="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        <StatTile icon={Ban} label="Cancelled deliveries" value={cancelledDeliveries} accent="bg-slate-500/10 text-slate-600 dark:text-slate-400" />
        <StatTile
          icon={Star}
          label="Average rating"
          value={averageRating || 0}
          decimals={1}
          fallback={averageRating ? undefined : <span className="text-base font-medium text-slate-400">No ratings yet</span>}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatTile
          icon={AlertTriangle}
          label="Complaints"
          value={complaintsCount}
          fallback={!complaintsCount ? <span className="text-base font-medium text-emerald-500">None</span> : undefined}
          accent="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        />
        <StatTile icon={Route} label="Distance covered (demo)" value={partner.totalDistanceCovered || 0} suffix=" km" accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
      </div>

      {/* Current location (demo GPS) */}
      {partner.currentLocation?.lat != null && partner.currentLocation?.lng != null && (
        <Card variant="glass" className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Navigation size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Current location: {partner.currentLocation.lat.toFixed(4)}, {partner.currentLocation.lng.toFixed(4)}
            </p>
            <p className="text-xs text-slate-400">Simulated GPS near {partner.assignedCity?.name} — demo data for illustration.</p>
          </div>
        </Card>
      )}

      {/* Recent deliveries */}
      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Recent deliveries</h2>
        {recentDeliveries.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <PackageSearch size={26} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No deliveries recorded for this partner yet.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {recentDeliveries.map((d) => (
              <Card key={d._id} variant="glass" className="flex flex-wrap items-center gap-4 p-4">
                {d.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.product.images[0]} alt={d.product.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={16} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{d.product?.name || 'Product'}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    {d.deliveredAt && (
                      <span className="flex items-center gap-1">
                        <CalendarClock size={11} /> Delivered {formatDate(d.deliveredAt)}
                      </span>
                    )}
                    {d.deliveryFee > 0 && (
                      <span className="flex items-center gap-1">
                        <Wallet size={11} /> {money(d.deliveryFee)}
                      </span>
                    )}
                  </p>
                </div>

                {d.deliveryRating ? <StarRow rating={d.deliveryRating} size={13} /> : <span className="shrink-0 text-xs text-slate-400">Not rated</span>}

                <OrderStatusBadge status={statusLabel(d.status)} />
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject delivery partner application">
        <form onSubmit={handleReject} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Reason for rejection</label>
          <textarea
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Vehicle documents could not be verified."
            className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <Button type="submit" variant="danger" loading={isRejecting} className="w-full">
            Confirm rejection
          </Button>
        </form>
      </Modal>

      <EditDeliveryPartnerModal open={editModalOpen} onClose={() => setEditModalOpen(false)} partner={partner} />
    </div>
  );
}
