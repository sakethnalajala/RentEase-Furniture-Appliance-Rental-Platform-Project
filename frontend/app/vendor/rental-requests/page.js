'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  ClipboardList, ImageOff, Check, X, Search, User, CalendarClock, MapPin, Clock, Layers, Hash,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import Badge from '@/components/ui/Badge';
import {
  useGetMyVendorProfileQuery, useListMyProductsQuery,
  useListRentalRequestDecisionsQuery, useDecideRentalRequestMutation,
} from '@/store/vendorApi';
import { buildRentalRequests, REQUEST_STATUSES } from '@/lib/mockVendorData';

const DECISION_STATUS_LABEL = { approved: 'Approved', declined: 'Declined' };

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...REQUEST_STATUSES.map((s) => ({ value: s, label: s }))];
const PAGE_SIZE = 20;

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

export default function VendorRentalRequestsPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: profileData } = useGetMyVendorProfileQuery();
  const vendorId = profileData?.data?._id;
  const { data: productsData, isLoading } = useListMyProductsQuery(
    { vendor: vendorId, city: selectedCity?.id, sort: 'newest', limit: 48 },
    { skip: !vendorId }
  );

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  const products = productsData?.data?.items || [];
  // 220 realistic requests synthesized from the vendor's real catalog — demo data (no Order
  // backend exists yet) but with genuine variety: different customers, cities, dates, plans.
  const rawRequests = useMemo(() => buildRentalRequests(products, 220), [products]);

  // Real, database-persisted Approve/Decline decisions, keyed by each mock request's own stable
  // id — overlaid on top of the synthesized list so a decision (and the buttons disappearing
  // because of it) survives a refresh instead of resetting to whatever status was seeded.
  const { data: decisionsData } = useListRentalRequestDecisionsQuery();
  const decisions = decisionsData?.data || {};
  const [decideRequest] = useDecideRentalRequestMutation();
  const [pendingId, setPendingId] = useState(null);

  const allRequests = useMemo(
    () => rawRequests.map((r) => (decisions[r.id] ? { ...r, status: DECISION_STATUS_LABEL[decisions[r.id]] } : r)),
    [rawRequests, decisions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRequests.filter((r) => {
      const matchesSearch =
        !q ||
        r.customerName.toLowerCase().includes(q) ||
        r.product.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.deliveryCity.toLowerCase().includes(q);
      const matchesStatus = !status || r.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [allRequests, search, status]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [search, status]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  const handleAction = async (requestId, action) => {
    // Guards against a double-click firing two requests before the first one's response (and
    // its cache invalidation, which is what actually removes the buttons) comes back — the
    // backend's own unique index rejects a genuine duplicate either way, but this avoids ever
    // sending the second one in the first place.
    if (pendingId) return;
    setPendingId(requestId);
    try {
      await decideRequest({ requestId, action }).unwrap();
      toast.success(action === 'approve' ? 'Rental request approved.' : 'Rental request declined.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update this request. Please try again.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Rental requests</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {allRequests.length} requests from customers across your catalog.
        </p>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search customer, product, city or request #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-48" />
      </Card>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <ClipboardList size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No rental requests match your filters.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((req) => (
              <Card key={req.id} variant="glass" hover className="p-4 transition-shadow duration-300 hover:shadow-glow">
                <div className="flex flex-wrap items-start gap-4">
                  {req.product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.product.images[0]} alt={req.product.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={18} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.product.name}</p>
                      <Badge variant="neutral">{req.categoryName}</Badge>
                      <OrderStatusBadge status={req.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{req.id}</p>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">&ldquo;{req.message}&rdquo;</p>
                  </div>

                  {req.status === 'Requested' && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        loading={pendingId === req.id}
                        disabled={pendingId !== null && pendingId !== req.id}
                        onClick={() => handleAction(req.id, 'approve')}
                      >
                        <Check size={14} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={pendingId === req.id}
                        disabled={pendingId !== null && pendingId !== req.id}
                        onClick={() => handleAction(req.id, 'decline')}
                      >
                        <X size={14} /> Decline
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 dark:border-white/10 sm:grid-cols-4">
                  <InfoItem icon={User} label="Customer" value={req.customerName} />
                  <InfoItem icon={Layers} label="Rental plan" value={req.rentalPlanLabel} />
                  <InfoItem icon={Hash} label="Quantity" value={req.quantity} />
                  <InfoItem
                    icon={CalendarClock}
                    label="Request date"
                    value={req.requestedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  />
                  <InfoItem icon={MapPin} label="Delivery city" value={req.deliveryCity} />
                  <InfoItem icon={MapPin} label="Delivery address" value={req.deliveryAddress} />
                  <InfoItem icon={Clock} label="Preferred delivery time" value={req.preferredDeliveryTime} />
                </div>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length))}
                className="focus-ring rounded-full border border-slate-200/70 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-600 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Load more
              </button>
            </div>
          )}

          {!hasMore && (
            <p className="pt-2 text-center text-xs text-slate-400">
              Showing all {filtered.length} of {allRequests.length} requests.
            </p>
          )}
        </>
      )}
    </div>
  );
}
