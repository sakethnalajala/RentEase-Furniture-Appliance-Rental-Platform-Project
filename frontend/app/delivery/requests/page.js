'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PackageSearch, Search, ImageOff, Check, X, User, Phone, MapPin, Building2, Layers, Wrench, Clock, Navigation, IndianRupee,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import {
  useListDeliveryRequestsQuery,
  useAcceptDeliveryRequestMutation,
  useRejectDeliveryRequestMutation,
} from '@/store/deliveryApi';
import { formatAddress, formatDateTime, money } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

// How long an "Accepted"/"Rejected" confirmation pill stays visible before the card exits —
// decoupled from how fast the background refetch happens, so the state is never just a flash.
const DECISION_HOLD_MS = 1400;

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{value || '—'}</p>
      </div>
    </div>
  );
}

// Replaces the Accept/Reject pair once a decision has been made — a light-highlighted pill
// matching the action taken, rather than leaving a button stuck in its "loading"/hover state.
function DecisionPill({ status }) {
  const isAccepted = status === 'accepted';
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
        isAccepted
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
      }`}
    >
      {isAccepted ? <Check size={14} /> : <X size={14} />}
      {isAccepted ? 'Accepted' : 'Rejected'}
    </motion.span>
  );
}

function RequestCard({ item, decision, acting, onAccept, onReject }) {
  const address = formatAddress(item.order?.deliveryAddress);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
    >
      <Card variant="glass" hover className="p-4 transition-shadow duration-300 hover:shadow-glow">
        <div className="flex flex-wrap items-start gap-4">
          {item.product?.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
              <ImageOff size={18} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.product?.name}</p>
              {item.product?.subCategory && <Badge variant="neutral">{item.product.subCategory}</Badge>}
              {item.product?.installationRequired && (
                <Badge variant="accent">
                  <Wrench size={11} /> Installation required
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Order {item.order?.orderNumber} · Requested {formatDateTime(item.order?.placedAt)}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {money(item.product?.monthlyRentalPrice)}/mo · {item.rentalPlan?.label || `${item.rentalPlan?.durationMonths} months`}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-300">
                <Navigation size={12} /> {item.distanceKm ?? '—'} km away
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <IndianRupee size={12} /> {money(item.estimatedDeliveryFee)} delivery fee
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
              {decision ? (
                <DecisionPill key="decision" status={decision} />
              ) : (
                <motion.div key="actions" exit={{ opacity: 0 }} className="flex gap-2">
                  <Button size="sm" loading={acting === 'accepting'} disabled={Boolean(acting)} onClick={onAccept}>
                    <Check size={14} /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" loading={acting === 'rejecting'} disabled={Boolean(acting)} onClick={onReject}>
                    <X size={14} /> Reject
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 dark:border-white/10 sm:grid-cols-4">
          <InfoItem icon={Building2} label="Pickup from" value={item.vendor?.businessName} />
          <InfoItem icon={MapPin} label="Pickup address" value={item.vendor?.businessAddress || item.vendor?.warehouseLocation?.name} />
          <InfoItem icon={User} label="Deliver to" value={item.order?.customer?.name} />
          <InfoItem icon={Phone} label="Customer phone" value={item.order?.customer?.phone} />
          <InfoItem icon={MapPin} label="Delivery address" value={address} />
          <InfoItem icon={Layers} label="Quantity" value={item.quantity} />
          <InfoItem icon={Clock} label="Requested plan" value={item.rentalPlan?.label || `${item.rentalPlan?.durationMonths} months`} />
          <InfoItem icon={Building2} label="Brand" value={item.product?.brand} />
        </div>
      </Card>
    </motion.div>
  );
}

export default function DeliveryRequestsPage() {
  const { data, isLoading, isFetching } = useListDeliveryRequestsQuery(undefined, { pollingInterval: LIVE_POLL_MS });
  const [acceptRequest] = useAcceptDeliveryRequestMutation();
  const [rejectRequest] = useRejectDeliveryRequestMutation();
  const [search, setSearch] = useState('');
  // itemId -> 'accepting' | 'rejecting' while the request is in flight.
  const [acting, setActing] = useState({});
  // itemId -> { status: 'accepted' | 'rejected', item } — a decided request is kept rendered
  // (from this pinned snapshot, not the live query data) for DECISION_HOLD_MS so the pill is
  // always visible for a beat, independent of how fast the background refetch removes it from
  // the server response.
  const [decisions, setDecisions] = useState({});

  const requests = useMemo(() => data?.data || [], [data]);

  // Clears a decision once its hold period elapses; if the item already dropped out of the
  // live list by then it simply disappears (natural AnimatePresence exit), otherwise it just
  // reverts to showing live Accept/Reject buttons again (shouldn't normally happen).
  useEffect(() => {
    const timers = Object.entries(decisions).map(([itemId, { at }]) =>
      setTimeout(() => {
        setDecisions((prev) => {
          if (!prev[itemId]) return prev;
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }, DECISION_HOLD_MS - (Date.now() - at))
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(decisions).join(',')]);

  // Live requests not yet decided, plus any just-decided items pinned from their snapshot
  // (covers the moment they've already been removed from the server response but the pill
  // should still be showing) — de-duped and filtered by search across both sources.
  const displayList = useMemo(() => {
    const byId = new Map(requests.map((r) => [r._id, r]));
    Object.entries(decisions).forEach(([id, { item }]) => {
      if (!byId.has(id)) byId.set(id, item);
    });
    const q = search.trim().toLowerCase();
    return [...byId.values()].filter(
      (r) =>
        !q ||
        r.product?.name?.toLowerCase().includes(q) ||
        r.vendor?.businessName?.toLowerCase().includes(q) ||
        r.order?.customer?.name?.toLowerCase().includes(q) ||
        r.order?.orderNumber?.toLowerCase().includes(q)
    );
  }, [requests, decisions, search]);

  const handleAccept = async (item) => {
    setActing((a) => ({ ...a, [item._id]: 'accepting' }));
    try {
      await acceptRequest(item._id).unwrap();
      setDecisions((d) => ({ ...d, [item._id]: { status: 'accepted', item, at: Date.now() } }));
      toast.success(`Delivery for ${item.product?.name} accepted.`);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not accept this request — it may already be taken.');
    } finally {
      setActing((a) => {
        const next = { ...a };
        delete next[item._id];
        return next;
      });
    }
  };

  const handleReject = async (item) => {
    setActing((a) => ({ ...a, [item._id]: 'rejecting' }));
    try {
      await rejectRequest(item._id).unwrap();
      setDecisions((d) => ({ ...d, [item._id]: { status: 'rejected', item, at: Date.now() } }));
      toast.success('Request declined — it stays open for other partners in your city.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not decline this request.');
    } finally {
      setActing((a) => {
        const next = { ...a };
        delete next[item._id];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Delivery requests</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {requests.length} open {requests.length === 1 ? 'request' : 'requests'} waiting in your city — first come, first served.
        </p>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search product, vendor, customer or order #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <PackageSearch size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {requests.length === 0 ? 'No open delivery requests right now — check back soon.' : 'No requests match your search.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {displayList.map((item) => (
              <RequestCard
                key={item._id}
                item={item}
                decision={decisions[item._id]?.status}
                acting={acting[item._id]}
                onAccept={() => handleAccept(item)}
                onReject={() => handleReject(item)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {isFetching && !isLoading && <p className="text-center text-xs text-slate-400">Refreshing…</p>}
    </div>
  );
}
