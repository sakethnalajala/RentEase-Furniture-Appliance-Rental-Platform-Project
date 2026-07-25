'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Building2, CheckCircle2, XCircle, Users, Package, ArrowRight, Clock, Truck, UsersRound,
  ShoppingBag, Hourglass, CalendarClock, IndianRupee, Wallet, BarChart3,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useGetAdminStatsQuery, useListVendorApplicationsQuery } from '@/store/adminApi';
import { fadeInUp, staggerContainer } from '@/lib/motion';

const QUICK_LINKS = [
  { href: '/admin/orders', label: 'Orders', description: 'Track order pipeline', icon: ShoppingBag, color: 'from-sky-500 to-sky-700' },
  { href: '/admin/payments', label: 'Payments', description: 'Revenue & transactions', icon: Wallet, color: 'from-emerald-500 to-teal-600' },
  { href: '/admin/analytics', label: 'Analytics', description: 'Platform-wide reports', icon: BarChart3, color: 'from-violet-500 to-purple-600' },
  { href: '/admin/products', label: 'Products', description: 'Manage the catalog', icon: Package, color: 'from-accent-500 to-accent-700' },
];

export default function AdminDashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: statsData, isLoading: loadingStats } = useGetAdminStatsQuery({ city: selectedCity?.id });
  const { data: pendingData, isLoading: loadingPending } = useListVendorApplicationsQuery({ status: 'pending', city: selectedCity?.id });

  const stats = statsData?.data;
  const pendingVendors = (pendingData?.data || []).slice(0, 5);

  const cards = [
    { label: 'Pending Vendors', value: stats?.pendingVendors, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Approved Vendors', value: stats?.approvedVendors, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Rejected Applications', value: stats?.rejectedVendors, icon: XCircle, color: 'from-rose-500 to-red-500' },
    { label: 'Suspended Vendors', value: stats?.suspendedVendors, icon: Building2, color: 'from-slate-500 to-slate-700' },
    { label: 'Total Vendors', value: stats?.totalVendors, icon: Building2, color: 'from-brand-500 to-brand-700' },
    { label: 'Total Customers', value: stats?.totalCustomers, icon: Users, color: 'from-sky-500 to-sky-700' },
    { label: 'Delivery Partners', value: stats?.totalDeliveryPartners, icon: Truck, color: 'from-violet-500 to-purple-600' },
    { label: 'Total Users', value: stats?.totalUsers, icon: UsersRound, color: 'from-slate-500 to-slate-700' },
    { label: 'Live Products', value: stats?.totalProducts, icon: Package, color: 'from-accent-500 to-accent-700' },
    { label: 'Total Orders', value: stats?.totalOrders, icon: ShoppingBag, color: 'from-indigo-500 to-indigo-700' },
    { label: 'Pending Orders', value: stats?.pendingOrders, icon: Hourglass, color: 'from-amber-500 to-yellow-600' },
    { label: 'Active Rentals', value: stats?.activeRentals, icon: CalendarClock, color: 'from-teal-500 to-emerald-600' },
    {
      label: 'Total Revenue',
      value: stats?.totalRevenue,
      icon: IndianRupee,
      color: 'from-emerald-500 to-green-600',
      format: (v) => `₹${(v || 0).toLocaleString('en-IN')}`,
    },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Welcome, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {selectedCity ? `Showing data for ${selectedCity.name}.` : 'Platform overview across all cities.'} Vendor approval queue below.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingStats
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : cards.map((c) => (
              <Card key={c.label} variant="glass" className="p-5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-premium`}>
                  <c.icon size={18} />
                </span>
                <p className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {c.format ? c.format(c.value) : c.value ?? 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
              </Card>
            ))}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Quick links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link key={q.href} href={q.href}>
              <Card variant="glass" hover className="flex items-center gap-3 p-4 transition-shadow duration-300 hover:shadow-glow">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${q.color} text-white shadow-premium`}>
                  <q.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.label}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{q.description}</p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-slate-400" />
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pending vendor requests
          </h2>
          <Link href="/admin/vendors" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            View all
          </Link>
        </div>

        {loadingPending ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : pendingVendors.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 size={28} className="text-emerald-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No pending vendor applications right now.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingVendors.map((vendor) => (
              <Link key={vendor._id} href={`/admin/vendors/${vendor._id}`}>
                <Card variant="glass" hover className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                      <Building2 size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{vendor.businessName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {vendor.user?.name} · {vendor.city?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">Pending</Badge>
                    <ArrowRight size={15} className="text-slate-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
