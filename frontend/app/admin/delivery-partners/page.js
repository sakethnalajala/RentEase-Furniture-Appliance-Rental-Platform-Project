'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  Truck, Bike, Car, Star, Phone, Mail, MapPin, Users, ArrowUpRight, Search, Zap,
  CheckCircle2, XCircle, PauseCircle, RotateCcw, AlertTriangle, Clock, Ban, Route, Pencil, Trash2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import {
  useAdminListDeliveryPartnersQuery,
  useApproveDeliveryPartnerMutation,
  useRejectDeliveryPartnerMutation,
  useSuspendDeliveryPartnerMutation,
  useReactivateDeliveryPartnerMutation,
  useAdminDeleteDeliveryPartnerMutation,
} from '@/store/adminApi';
import EditDeliveryPartnerModal from '@/components/admin/EditDeliveryPartnerModal';
import { initials } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const VEHICLE_ICONS = { bike: Bike, van: Car, truck: Truck };

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

const STATUS_BADGE = { pending: 'neutral', approved: 'success', rejected: 'accent', suspended: 'accent' };

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
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-brand-500' : 'bg-amber-500'}`} />
      {isAvailable ? 'Available' : 'Busy'}
    </span>
  );
}

function DeliveryPartnerCard({ partner, onApprove, onReject, onSuspend, onReactivate, onEdit, onDelete, actionLoading, isDeleting }) {
  const avatarSrc = partner.user?.avatar || partner.profilePhoto;
  const VehicleIcon = VEHICLE_ICONS[partner.vehicleType] || Truck;
  const status = partner.status || 'approved';

  return (
    <Card variant="glass" hover className="overflow-hidden p-0 transition-shadow duration-300 hover:shadow-glow">
      <Link href={`/admin/delivery-partners/${partner._id}`} className="flex flex-col p-5">
        <div className="flex items-start gap-3">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={partner.user?.name}
              className="h-14 w-14 shrink-0 rounded-full object-cover shadow-premium"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white shadow-premium">
              {initials(partner.user?.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{partner.user?.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_BADGE[status]}>{status}</Badge>
              <OnlinePill isOnline={partner.isOnline} />
              <AvailabilityPill isAvailable={partner.isAvailable} />
            </div>
          </div>

          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {partner.averageRating ? partner.averageRating.toFixed(1) : '—'}
          </span>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-1.5">
            <Phone size={12} className="shrink-0" /> {partner.user?.phone || '—'}
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <Mail size={12} className="shrink-0" /> <span className="truncate">{partner.user?.email}</span>
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <MapPin size={12} className="shrink-0" />
            {partner.assignedCity?.name}
            {partner.assignedCity?.state ? `, ${partner.assignedCity.state}` : ''}
            {` · ${partner.area || 'Area not set'}`}
          </p>
          <p className="flex items-center gap-1.5 capitalize">
            <VehicleIcon size={12} className="shrink-0" /> {partner.vehicleType} · {partner.vehicleNumber}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 dark:border-white/10">
          <span className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {partner.completedDeliveries ?? partner.totalDeliveries ?? 0} completed
            {partner.activeDeliveries > 0 && (
              <span className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
                <Zap size={11} /> {partner.activeDeliveries} active
              </span>
            )}
            {partner.pendingDeliveries > 0 && (
              <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                <Clock size={11} /> {partner.pendingDeliveries} pending
              </span>
            )}
            {partner.cancelledDeliveries > 0 && (
              <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                <Ban size={11} /> {partner.cancelledDeliveries} cancelled
              </span>
            )}
            {partner.complaintsCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                <AlertTriangle size={11} /> {partner.complaintsCount} complaints
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
            View profile <ArrowUpRight size={12} />
          </span>
        </div>

        {typeof partner.totalDistanceCovered === 'number' && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Route size={12} className="shrink-0" /> ~{partner.totalDistanceCovered} km covered (demo)
          </p>
        )}
      </Link>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/70 px-5 py-3 dark:border-white/10">
        {status === 'pending' && (
          <>
            <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => onApprove(partner._id)}>
              <CheckCircle2 size={14} /> Approve
            </Button>
            <Button size="sm" variant="ghost" loading={actionLoading} onClick={() => onReject(partner._id)}>
              <XCircle size={14} /> Reject
            </Button>
          </>
        )}
        {status === 'approved' && (
          <Button size="sm" variant="ghost" loading={actionLoading} onClick={() => onSuspend(partner._id)}>
            <PauseCircle size={14} /> Suspend
          </Button>
        )}
        {(status === 'suspended' || status === 'rejected') && (
          <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => onReactivate(partner._id)}>
            <RotateCcw size={14} /> Reactivate
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(partner)}>
          <Pencil size={14} /> Edit
        </Button>
        <Button size="sm" variant="danger" loading={isDeleting} onClick={() => onDelete(partner)}>
          <Trash2 size={14} /> Delete
        </Button>
      </div>
    </Card>
  );
}

export default function AdminDeliveryPartnersPage() {
  const [statusTab, setStatusTab] = useState('');
  const [search, setSearch] = useState('');
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data, isLoading } = useAdminListDeliveryPartnersQuery(
    { status: statusTab || undefined, city: selectedCity?.id },
    { pollingInterval: LIVE_POLL_MS }
  );
  const [approvePartner, { isLoading: isApproving }] = useApproveDeliveryPartnerMutation();
  const [rejectPartner, { isLoading: isRejecting }] = useRejectDeliveryPartnerMutation();
  const [suspendPartner, { isLoading: isSuspending }] = useSuspendDeliveryPartnerMutation();
  const [reactivatePartner, { isLoading: isReactivating }] = useReactivateDeliveryPartnerMutation();
  const [deletePartner, { isLoading: isDeleting }] = useAdminDeleteDeliveryPartnerMutation();
  const [editingPartner, setEditingPartner] = useState(null);

  const partners = data?.data || [];
  const onlineCount = partners.filter((p) => p.isOnline).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(
      (p) =>
        p.user?.name?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q) ||
        p.assignedCity?.name?.toLowerCase().includes(q) ||
        p.vehicleNumber?.toLowerCase().includes(q)
    );
  }, [partners, search]);

  const handleApprove = async (id) => {
    try {
      await approvePartner(id).unwrap();
      toast.success('Delivery partner approved.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not approve delivery partner.');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectPartner({ id, reason: 'Application did not meet delivery partner requirements.' }).unwrap();
      toast.success('Delivery partner application rejected.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reject delivery partner.');
    }
  };

  const handleSuspend = async (id) => {
    try {
      await suspendPartner(id).unwrap();
      toast.success('Delivery partner suspended.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not suspend delivery partner.');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await reactivatePartner(id).unwrap();
      toast.success('Delivery partner reactivated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reactivate delivery partner.');
    }
  };

  const handleDelete = async (partner) => {
    if (!window.confirm(`Delete "${partner.user?.name}"? This cannot be undone.`)) return;
    try {
      await deletePartner(partner._id).unwrap();
      toast.success('Delivery partner deleted.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not delete delivery partner.');
    }
  };

  const actionLoading = isApproving || isRejecting || isSuspending || isReactivating;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Delivery Partners</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Live status and performance across your delivery fleet{selectedCity ? ` in ${selectedCity.name}` : ''}.
          {partners.length > 0 && ` ${partners.length} partners, ${onlineCount} online right now.`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusTab === t.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, email, city or vehicle number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <Users size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {partners.length === 0 ? 'No delivery partners on the platform yet.' : 'No partners match your search.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((partner) => (
            <DeliveryPartnerCard
              key={partner._id}
              partner={partner}
              onApprove={handleApprove}
              onReject={handleReject}
              onSuspend={handleSuspend}
              onReactivate={handleReactivate}
              onEdit={setEditingPartner}
              onDelete={handleDelete}
              actionLoading={actionLoading}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      <EditDeliveryPartnerModal open={Boolean(editingPartner)} onClose={() => setEditingPartner(null)} partner={editingPartner} />
    </div>
  );
}
