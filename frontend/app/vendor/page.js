'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Package, Boxes, AlertTriangle, Star, IndianRupee, TrendingUp, ArrowUpRight, ShoppingBag, ImageOff,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { useGetMyVendorProfileQuery, useGetMyVendorStatsQuery, useListMyProductsQuery } from '@/store/vendorApi';
import { buildVendorOrders } from '@/lib/mockVendorData';

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card variant="glass" hover className="p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{sub}</p>}
    </Card>
  );
}

export default function VendorDashboardPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfileQuery();
  const { data: statsData, isLoading: statsLoading } = useGetMyVendorStatsQuery({ city: selectedCity?.id });
  const { data: productsData } = useListMyProductsQuery(
    { vendor: profileData?.data?._id, city: selectedCity?.id, limit: 24, sort: 'newest' },
    { skip: !profileData?.data?._id }
  );

  const vendor = profileData?.data;
  const stats = statsData?.data;
  const products = useMemo(() => productsData?.data?.items || [], [productsData]);
  const recentOrders = useMemo(() => buildVendorOrders(products, 6), [products]);
  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 2).slice(0, 5), [products]);

  const loading = profileLoading || statsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back{vendor ? `, ${vendor.businessName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Here&apos;s how your inventory is performing today.
          </p>
        </div>
        {vendor?.status && (
          <Badge variant={vendor.status === 'approved' ? 'success' : 'neutral'} className="capitalize">
            {vendor.status}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Package}
            label="Total products"
            value={stats?.totalProducts?.toLocaleString('en-IN') || 0}
            accent="bg-brand-500/10 text-brand-600 dark:text-brand-300"
          />
          <StatCard
            icon={Boxes}
            label="Total stock units"
            value={stats?.totalStock?.toLocaleString('en-IN') || 0}
            accent="bg-accent-500/10 text-accent-600 dark:text-accent-300"
          />
          <StatCard
            icon={AlertTriangle}
            label="Low stock alerts"
            value={stats?.lowStockCount || 0}
            sub={stats?.lowStockCount > 0 ? 'Needs restocking soon' : undefined}
            accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={Star}
            label="Average rating"
            value={stats?.averageRating?.toFixed(1) || '0.0'}
            accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="glass" className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Recent customer orders</h2>
            <Link href="/vendor/orders" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <ShoppingBag size={28} className="text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No orders yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-white/10"
                >
                  {order.product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.product.images[0]} alt={order.product.name} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{order.product.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {order.customerName} · {order.id}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Low stock alerts</h2>
            <Link href="/vendor/inventory?filter=low" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Manage <ArrowUpRight size={12} />
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <Boxes size={28} className="text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Stock levels look healthy.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {lowStockProducts.map((p) => (
                <div key={p._id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.subCategory}</p>
                  </div>
                  <Badge variant="neutral" className="!bg-amber-500/15 !text-amber-700 shrink-0 dark:!text-amber-300">
                    {p.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-premium">
            <TrendingUp size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {stats?.totalUnitsRented?.toLocaleString('en-IN') || 0} total units rented lifetime
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <IndianRupee size={11} className="mb-0.5 inline" />
              {Math.round(stats?.averagePrice || 0).toLocaleString('en-IN')} average monthly rent across your catalog
            </p>
          </div>
        </div>
        <Link
          href="/vendor/analytics"
          className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-premium hover:shadow-glow"
        >
          View full analytics
        </Link>
      </Card>
    </div>
  );
}
