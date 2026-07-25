'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Building2, CheckCircle2, XCircle, ArrowRight, Users, PauseCircle, RotateCcw, Search, Pencil, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Input from '@/components/ui/Input';
import EditVendorModal from '@/components/admin/EditVendorModal';
import {
  useListVendorApplicationsQuery,
  useApproveVendorApplicationMutation,
  useRejectVendorApplicationMutation,
  useSuspendVendorApplicationMutation,
  useReactivateVendorApplicationMutation,
  useAdminDeleteVendorMutation,
} from '@/store/adminApi';
import { money } from '@/lib/deliveryHelpers';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

const STATUS_BADGE = {
  pending: 'neutral',
  approved: 'success',
  rejected: 'accent',
  suspended: 'accent',
};

export default function VendorManagementPage() {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [editingVendor, setEditingVendor] = useState(null);
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data, isLoading } = useListVendorApplicationsQuery({ status: tab, city: selectedCity?.id, search: search || undefined });
  const [approveVendor, { isLoading: isApproving }] = useApproveVendorApplicationMutation();
  const [rejectVendor, { isLoading: isRejecting }] = useRejectVendorApplicationMutation();
  const [suspendVendor, { isLoading: isSuspending }] = useSuspendVendorApplicationMutation();
  const [reactivateVendor, { isLoading: isReactivating }] = useReactivateVendorApplicationMutation();
  const [deleteVendor, { isLoading: isDeleting }] = useAdminDeleteVendorMutation();

  const vendors = data?.data || [];

  const handleApprove = async (id) => {
    try {
      await approveVendor(id).unwrap();
      toast.success('Vendor approved successfully.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not approve vendor.');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectVendor({ id, reason: 'Application did not meet marketplace requirements.' }).unwrap();
      toast.success('Vendor application rejected.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reject vendor.');
    }
  };

  const handleSuspend = async (id) => {
    try {
      await suspendVendor(id).unwrap();
      toast.success('Vendor suspended.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not suspend vendor.');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await reactivateVendor(id).unwrap();
      toast.success('Vendor reactivated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reactivate vendor.');
    }
  };

  const handleDelete = async (vendor) => {
    if (!window.confirm(`Delete "${vendor.businessName}"? This cannot be undone.`)) return;
    try {
      await deleteVendor(vendor._id).unwrap();
      toast.success('Vendor deleted.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not delete vendor.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Vendor Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review, approve, reject, suspend, or reactivate vendors
          {selectedCity ? ` in ${selectedCity.name}` : ' across all cities'}.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-2 p-12 text-center">
          <Users size={28} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No {tab} vendor applications.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <Card key={vendor._id} variant="glass" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/admin/vendors/${vendor._id}`} className="flex flex-1 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                  <Building2 size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{vendor.businessName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {vendor.user?.name} · {vendor.user?.email} · {vendor.city?.name}
                    {vendor.area ? `, ${vendor.area}` : ''}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {vendor.productsCount ?? 0} products · {money(vendor.revenue)} revenue
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_BADGE[vendor.status]}>{vendor.status}</Badge>
                {vendor.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary" loading={isApproving} onClick={() => handleApprove(vendor._id)}>
                      <CheckCircle2 size={14} /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" loading={isRejecting} onClick={() => handleReject(vendor._id)}>
                      <XCircle size={14} /> Reject
                    </Button>
                  </>
                )}
                {vendor.status === 'approved' && (
                  <Button size="sm" variant="ghost" loading={isSuspending} onClick={() => handleSuspend(vendor._id)}>
                    <PauseCircle size={14} /> Suspend
                  </Button>
                )}
                {(vendor.status === 'suspended' || vendor.status === 'rejected') && (
                  <Button size="sm" variant="secondary" loading={isReactivating} onClick={() => handleReactivate(vendor._id)}>
                    <RotateCcw size={14} /> Reactivate
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditingVendor(vendor)}>
                  <Pencil size={14} />
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" loading={isDeleting} onClick={() => handleDelete(vendor)}>
                  <Trash2 size={14} />
                </Button>
                <Link href={`/admin/vendors/${vendor._id}`}>
                  <Button size="sm" variant="ghost">
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditVendorModal open={Boolean(editingVendor)} vendor={editingVendor} onClose={() => setEditingVendor(null)} />
    </div>
  );
}
