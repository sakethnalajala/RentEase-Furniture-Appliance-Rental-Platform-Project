'use client';

import { useMemo, useState } from 'react';
import { History, Search, ImageOff, IndianRupee } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { useListDeliveryHistoryQuery } from '@/store/deliveryApi';
import { statusLabel, formatDateTime, money } from '@/lib/deliveryHelpers';

const FILTER_OPTIONS = [
  { value: '', label: 'All history' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Everything the /delivery/history endpoint returns is already past preparing/out_for_delivery
// (see backend/src/controllers/delivery.controller.js `listHistory`) — in practice that's
// mostly `active_rental` (a successfully completed delivery, OTP verified) plus any items that
// were `cancelled` before or during the delivery. This page groups by that real distinction
// rather than inventing a broader status taxonomy.
function isCancelled(item) {
  return item.status === 'cancelled';
}

export default function DeliveryHistoryPage() {
  const { data, isLoading } = useListDeliveryHistoryQuery();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const items = useMemo(() => data?.data || [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const cancelled = isCancelled(item);
      const matchesFilter = !filter || (filter === 'cancelled' ? cancelled : !cancelled);
      const matchesSearch =
        !q ||
        item.product?.name?.toLowerCase().includes(q) ||
        item.order?.customer?.name?.toLowerCase().includes(q) ||
        item.order?.orderNumber?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [items, search, filter]);

  const completedCount = items.filter((i) => !isCancelled(i)).length;
  const cancelledCount = items.filter(isCancelled).length;
  const totalEarned = items.filter((i) => !isCancelled(i)).reduce((sum, i) => sum + (i.deliveryFee || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Delivery history</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {completedCount} completed · {cancelledCount} cancelled · {money(totalEarned)} earned from completed deliveries.
        </p>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search product, customer or order #…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onChange={setFilter} options={FILTER_OPTIONS} className="w-44" />
      </Card>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <History size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No delivery history matches your filters yet.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <Card key={item._id} variant="glass" className="flex flex-wrap items-center gap-4 p-4">
              {item.product?.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.product.images[0]} alt={item.product.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                  <ImageOff size={18} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.product?.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {item.order?.customer?.name} · {item.order?.orderNumber}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                  {item.pickedUpAt && <span>Picked up {formatDateTime(item.pickedUpAt)}</span>}
                  {item.deliveredAt && <span>Delivered {formatDateTime(item.deliveredAt)}</span>}
                </p>
              </div>

              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-sm font-semibold text-slate-900 dark:text-white">
                  <IndianRupee size={13} /> {Math.round(item.deliveryFee || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-slate-400">delivery fee</p>
              </div>

              <OrderStatusBadge status={statusLabel(item.status)} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
