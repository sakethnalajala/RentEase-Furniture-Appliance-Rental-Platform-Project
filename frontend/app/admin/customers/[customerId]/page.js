'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Home,
  ShoppingBag,
  PackageSearch,
  ImageOff,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Wallet,
  Users,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { CountUpNumber } from '@/components/vendor/AnalyticsCharts';
import { useAdminGetCustomerQuery } from '@/store/adminApi';
import { money, formatDate, formatDateTime, statusLabel, initials } from '@/lib/deliveryHelpers';
import { fadeInUp, staggerContainer } from '@/lib/motion';

function StatTile({ icon: Icon, label, value, prefix = '', decimals = 0, accent }) {
  return (
    <Card variant="glass" className="p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={16} />
      </div>
      <p className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
        <CountUpNumber value={value} prefix={prefix} decimals={decimals} />
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

export default function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const { data, isLoading } = useAdminGetCustomerQuery(customerId);

  const customer = data?.data?.customer;
  const orders = data?.data?.orders || [];
  const addresses = data?.data?.addresses || [];
  const totalOrders = data?.data?.totalOrders ?? 0;
  const activeRentals = data?.data?.activeRentals ?? 0;
  const completedRentals = data?.data?.completedRentals ?? 0;
  const cancelledOrders = data?.data?.cancelledOrders ?? 0;
  const totalSpending = data?.data?.totalSpending ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
        <Users size={32} className="text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">This customer isn&apos;t available anymore.</p>
        <Link
          href="/admin/customers"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          <ArrowLeft size={14} /> Back to Customers
        </Link>
      </Card>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeInUp}>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
        >
          <ArrowLeft size={15} /> Back to Customers
        </Link>
      </motion.div>

      {/* Profile header */}
      <motion.div variants={fadeInUp}>
        <Card variant="glass" className="flex flex-wrap items-start gap-5 p-6">
          {customer.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customer.avatar} alt={customer.name} className="h-20 w-20 shrink-0 rounded-full object-cover shadow-premium" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-premium">
              {initials(customer.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{customer.name}</h1>
              <Badge variant={customer.isActive !== false ? 'success' : 'neutral'}>
                {customer.isActive !== false ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {customer.email}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} /> {customer.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Joined {formatDate(customer.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} /> {customer.lastLoginAt ? `Last login ${formatDateTime(customer.lastLoginAt)}` : 'Never logged in'}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Saved addresses */}
      <motion.div variants={fadeInUp}>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Saved addresses</h2>
        {addresses.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-8 text-center">
            <MapPin size={24} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No saved address.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => (
              <Card key={addr._id} variant="glass" className="flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                  <Home size={16} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{addr.label || 'Address'}</p>
                    {addr.isDefault && <Badge variant="brand">Default</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {addr.city?.name}
                    {addr.state ? `, ${addr.state}` : ''}
                    {addr.pincode ? ` – ${addr.pincode}` : ''}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile icon={ShoppingBag} label="Total orders" value={totalOrders} accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
        <StatTile icon={CalendarClock} label="Active rentals" value={activeRentals} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <StatTile icon={CheckCircle2} label="Completed rentals" value={completedRentals} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatTile icon={XCircle} label="Cancelled orders" value={cancelledOrders} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
        <StatTile icon={Wallet} label="Total spending" value={totalSpending} prefix="₹" accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </motion.div>

      {/* Orders */}
      <motion.div variants={fadeInUp}>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Order history</h2>
        {orders.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <PackageSearch size={26} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">This customer hasn&apos;t placed any orders yet.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => {
              const firstItem = order.items?.[0];
              const extraCount = (order.items?.length || 0) - 1;
              return (
                <Card key={order._id} variant="glass" className="flex flex-wrap items-center gap-4 p-4">
                  {firstItem?.product?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstItem.product.images[0]} alt={firstItem.product.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={16} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {firstItem?.product?.name || 'Product'}
                      {extraCount > 0 && ` +${extraCount} more`}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      <span>#{order.orderNumber}</span>
                      {order.placedAt && <span>{formatDate(order.placedAt)}</span>}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">{money(order.grandTotalDue)}</p>
                  <OrderStatusBadge status={statusLabel(order.status)} />
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
