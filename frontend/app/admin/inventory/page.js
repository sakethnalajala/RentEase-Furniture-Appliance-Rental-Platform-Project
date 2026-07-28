'use client';

import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Package,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Wrench,
  MapPin,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminGetInventoryOverviewQuery } from '@/store/adminApi';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const STATUS_META = {
  available: { label: 'Available', icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
  reserved: { label: 'Reserved', icon: Clock, color: 'from-amber-500 to-orange-500' },
  out_for_rent: { label: 'Out for rent', icon: Truck, color: 'from-brand-500 to-brand-700' },
  under_maintenance: { label: 'Under maintenance', icon: Wrench, color: 'from-rose-500 to-red-500' },
};

export default function AdminInventoryPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data, isLoading } = useAdminGetInventoryOverviewQuery({ city: selectedCity?.id }, { pollingInterval: LIVE_POLL_MS });
  const inv = data?.data;

  const statCards = [
    { label: 'Total Products', value: inv?.totalProducts, icon: Package, color: 'from-brand-500 to-brand-700' },
    { label: 'Total Stock Units', value: inv?.totalStock, icon: Boxes, color: 'from-emerald-500 to-teal-500' },
    {
      label: 'Low Stock Alerts',
      value: inv?.lowStockCount,
      icon: AlertTriangle,
      color: inv?.lowStockCount > 0 ? 'from-rose-500 to-red-500' : 'from-slate-400 to-slate-500',
    },
  ];

  const statusEntries = Object.entries(STATUS_META).map(([key, meta]) => ({
    key,
    ...meta,
    value: inv?.inventoryByStatus?.[key] || 0,
  }));

  const byCity = inv?.byCity || [];
  const maxCityStock = Math.max(1, ...byCity.map((c) => c.totalStock || 0));
  const lowStockProducts = inv?.lowStockProducts || [];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Inventory management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          A live snapshot of platform-wide stock levels and low-stock alerts — this view doesn’t track a stock
          movement history/ledger, which this build doesn’t maintain.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : statCards.map((c) => (
              <Card key={c.label} variant="glass" className="p-5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-premium`}>
                  <c.icon size={18} />
                </span>
                <p className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">{c.value ?? 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
              </Card>
            ))}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Inventory by status
        </h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statusEntries.map((s) => (
              <Card key={s.key} variant="glass" className="flex items-center gap-3 p-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-premium`}>
                  <s.icon size={16} />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Stock by city
        </h2>
        {isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : byCity.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <MapPin size={26} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No stock recorded yet.</p>
          </Card>
        ) : (
          <Card variant="glass" className="space-y-4 p-5">
            {byCity.map((c) => (
              <div key={c.cityName || 'unknown'}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                    <MapPin size={13} className="text-brand-500 dark:text-brand-300" />
                    {c.cityName || 'Unassigned'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {c.totalStock?.toLocaleString('en-IN')} units · {c.productCount} products
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/5 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                    style={{ width: `${Math.max(4, ((c.totalStock || 0) / maxCityStock) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>
        )}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Low stock alerts
          </h2>
          {!isLoading && <Badge variant="neutral">Threshold ≤ {inv?.lowStockThreshold ?? 3} units</Badge>}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : lowStockProducts.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 size={28} className="text-emerald-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No low-stock products right now.</p>
          </Card>
        ) : (
          <Card variant="glass" className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p._id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{p.sku}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.brand}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.city?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.vendor?.businessName || 'RentEase'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="neutral"
                          className={
                            p.stock <= 1
                              ? '!bg-rose-100 !text-rose-700 dark:!bg-rose-500/15 dark:!text-rose-300'
                              : '!bg-amber-100 !text-amber-700 dark:!bg-amber-500/15 dark:!text-amber-300'
                          }
                        >
                          <AlertTriangle size={11} /> {p.stock} left
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
