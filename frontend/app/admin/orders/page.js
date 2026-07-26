'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { ShoppingBag, ImageOff, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { useAdminListOrdersQuery } from '@/store/adminApi';
import { statusLabel, formatDate, money } from '@/lib/deliveryHelpers';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_ORDER = [
  'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered',
  'active_rental', 'extension_requested', 'pickup_scheduled', 'returned', 'completed', 'cancelled',
];

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const selectedCity = useSelector((state) => state.city.selectedCity);

  const { data, isLoading, isFetching } = useAdminListOrdersQuery({ group: tab, page, limit: PAGE_SIZE, city: selectedCity?.id });
  const payload = data?.data;
  const items = payload?.items || [];
  const statusCounts = payload?.statusCounts || {};
  const totalPages = payload?.pages || 1;

  const handleTab = (key) => {
    setTab(key);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Orders Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform-wide order pipeline across every vendor.
          {payload?.total !== undefined && ` ${payload.total} orders in this view.`}
        </p>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <Badge key={s} variant="neutral" className="gap-1">
            {statusLabel(s)} <span className="font-semibold text-slate-900 dark:text-white">{statusCounts[s] || 0}</span>
          </Badge>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTab(t.key)}
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

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <ShoppingBag size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No {tab} orders right now.</p>
        </Card>
      ) : (
        <Card variant="glass" className={`overflow-hidden p-0 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Delivery partner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Order date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const amount = (item.monthlyRentalPrice || 0) * (item.quantity || 1);
                  return (
                    <tr key={item._id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product.images[0]} alt={item.product?.name} loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                              <ImageOff size={14} />
                            </div>
                          )}
                          <span className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white">{item.product?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <p className="truncate">{item.order?.customer?.name || '—'}</p>
                        <p className="truncate text-xs text-slate-400">{item.order?.orderNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.vendor?.businessName || 'RentEase'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {item.deliveryPartner?.user?.name ? (
                          <span className="flex items-center gap-1.5">
                            <Truck size={12} className="shrink-0 text-slate-400" /> {item.deliveryPartner.user.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={statusLabel(item.status)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatDate(item.order?.placedAt || item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{money(amount)}/mo</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!isLoading && items.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
