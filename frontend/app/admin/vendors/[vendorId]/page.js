'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  User,
  Pencil,
  Trash2,
  Package,
  Zap,
  Wallet,
  Navigation,
  ShoppingBag,
  Receipt,
  Boxes,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EditVendorModal from '@/components/admin/EditVendorModal';
import {
  useGetVendorApplicationQuery,
  useApproveVendorApplicationMutation,
  useRejectVendorApplicationMutation,
  useSuspendVendorApplicationMutation,
  useReactivateVendorApplicationMutation,
  useAdminDeleteVendorMutation,
} from '@/store/adminApi';
import { money } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const STATUS_BADGE = { pending: 'neutral', approved: 'success', rejected: 'accent', suspended: 'accent' };

export default function VendorDetailPage() {
  const { vendorId } = useParams();
  const router = useRouter();
  const { data, isLoading } = useGetVendorApplicationQuery(vendorId, { pollingInterval: LIVE_POLL_MS });
  const [approveVendor, { isLoading: isApproving }] = useApproveVendorApplicationMutation();
  const [rejectVendor, { isLoading: isRejecting }] = useRejectVendorApplicationMutation();
  const [suspendVendor, { isLoading: isSuspending }] = useSuspendVendorApplicationMutation();
  const [reactivateVendor, { isLoading: isReactivating }] = useReactivateVendorApplicationMutation();
  const [deleteVendor, { isLoading: isDeleting }] = useAdminDeleteVendorMutation();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reason, setReason] = useState('');

  const vendor = data?.data;

  const handleApprove = async () => {
    try {
      await approveVendor(vendorId).unwrap();
      toast.success('Vendor approved successfully.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not approve vendor.');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await rejectVendor({ id: vendorId, reason }).unwrap();
      toast.success('Vendor application rejected.');
      setRejectModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reject vendor.');
    }
  };

  const handleSuspend = async () => {
    try {
      await suspendVendor(vendorId).unwrap();
      toast.success('Vendor suspended.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not suspend vendor.');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateVendor(vendorId).unwrap();
      toast.success('Vendor reactivated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reactivate vendor.');
    }
  };

  const handleDelete = async () => {
    if (!vendor) return;
    if (!window.confirm(`Delete "${vendor.businessName}"? This cannot be undone.`)) return;
    try {
      await deleteVendor(vendorId).unwrap();
      toast.success('Vendor deleted.');
      router.push('/admin/vendors');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not delete vendor.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <Card variant="glass" className="p-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Vendor application not found.</p>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <Card variant="glass" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-premium">
              <Building2 size={24} />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{vendor.businessName}</h1>
              <Badge variant={STATUS_BADGE[vendor.status]} className="mt-1">
                {vendor.status}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {vendor.status === 'pending' && (
              <>
                <Button loading={isApproving} onClick={handleApprove}>
                  <CheckCircle2 size={16} /> Approve
                </Button>
                <Button variant="secondary" onClick={() => setRejectModalOpen(true)}>
                  <XCircle size={16} /> Reject
                </Button>
              </>
            )}
            {vendor.status === 'approved' && (
              <Button variant="danger" loading={isSuspending} onClick={handleSuspend}>
                <Ban size={16} /> Suspend
              </Button>
            )}
            {(vendor.status === 'suspended' || vendor.status === 'rejected') && (
              <Button variant="secondary" loading={isReactivating} onClick={handleReactivate}>
                <RotateCcw size={16} /> Reactivate
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
              <Pencil size={16} /> Edit
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleDelete}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>

        {vendor.status === 'rejected' && vendor.rejectionReason && (
          <div className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
            <strong>Rejection reason:</strong> {vendor.rejectionReason}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoRow icon={User} label="Applicant" value={vendor.user?.name} />
          <InfoRow icon={Mail} label="Email" value={vendor.user?.email} />
          <InfoRow icon={Phone} label="Phone" value={vendor.user?.phone || '—'} />
          <InfoRow icon={MapPin} label="Operating city" value={`${vendor.city?.name}, ${vendor.city?.state}`} />
          <InfoRow icon={Calendar} label="Applied on" value={new Date(vendor.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} />
          <InfoRow icon={FileText} label="GST number" value={vendor.gstNumber || 'Not provided'} />
          <InfoRow icon={FileText} label="PAN number" value={vendor.panNumber || 'Not provided'} />
          <InfoRow icon={MapPin} label="Business address" value={vendor.businessAddress || 'Not provided'} />
          <InfoRow icon={MapPin} label="Area" value={vendor.area || 'Not provided'} />
          <InfoRow icon={Package} label="Products listed" value={vendor.productsCount ?? 0} />
          <InfoRow icon={Boxes} label="Inventory units" value={vendor.inventoryCount ?? 0} />
          <InfoRow icon={ShoppingBag} label="Orders" value={vendor.totalOrders ?? 0} />
          <InfoRow icon={Zap} label="Active rentals" value={vendor.activeRentals ?? 0} />
          <InfoRow icon={Receipt} label="Payments" value={`${vendor.totalPayments ?? 0} (${money(vendor.totalPaid || 0)})`} />
          <InfoRow icon={Wallet} label="Revenue" value={money(vendor.revenue)} />
          <InfoRow
            icon={Navigation}
            label="Map location"
            value={
              vendor.warehouseLocation?.lat != null && vendor.warehouseLocation?.lng != null
                ? `${Number(vendor.warehouseLocation.lat).toFixed(4)}, ${Number(vendor.warehouseLocation.lng).toFixed(4)}`
                : 'Not set'
            }
          />
        </div>

        <div className="mt-6 border-t border-slate-200/70 pt-4 dark:border-white/10">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Uploaded business documents</p>
          {vendor.documents?.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {vendor.documents.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <FileText size={14} /> {doc.type || 'Document'}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No documents uploaded yet — document upload isn’t wired into vendor registration in this build.
            </p>
          )}
        </div>
      </Card>

      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject vendor application">
        <form onSubmit={handleReject} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Reason for rejection</label>
          <textarea
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Business documents did not match the registered name."
            className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <Button type="submit" variant="danger" loading={isRejecting} className="w-full">
            Confirm rejection
          </Button>
        </form>
      </Modal>

      <EditVendorModal open={editModalOpen} vendor={vendor} onClose={() => setEditModalOpen(false)} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}
