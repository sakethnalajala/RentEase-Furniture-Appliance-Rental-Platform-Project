'use client';

import Link from 'next/link';
import { Package, History, Wrench, Receipt, FileText, Star, Bell, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import { useListMyOrderItemsQuery, useListMyPaymentsQuery } from '@/store/orderApi';
import { useMockRentals } from '@/hooks/useMockRentals';

export default function RentalsHubPage() {
  const { data: allItemsData, isLoading: loadingItems } = useListMyOrderItemsQuery();
  const { data: paymentsData, isLoading: loadingPayments } = useListMyPaymentsQuery();
  // Maintenance Requests / Reviews aren't part of this pass's real-data migration (see
  // customer/rentals/maintenance and customer/reviews — untouched, still their existing
  // behavior) — only their counts are still sourced from the mock hook here.
  const { maintenanceRequests } = useMockRentals();

  const allItems = allItemsData?.data || [];
  const payments = paymentsData?.data || [];
  const activeCount = allItems.filter((r) => r.status === 'active_rental').length;
  const isLoading = loadingItems || loadingPayments;

  const CARDS = [
    { href: '/customer/rentals/current', icon: Package, title: 'Current Rentals', body: 'Products you’re renting right now.', count: activeCount },
    { href: '/customer/rentals/history', icon: History, title: 'Rental History', body: 'Every rental you’ve completed, cancelled, or extended.', count: allItems.length },
    { href: '/customer/rentals/payments', icon: Receipt, title: 'Payment History', body: 'Transactions, methods, and statuses.', count: payments.length },
    { href: '/customer/rentals/invoices', icon: FileText, title: 'Invoices', body: 'Download or print a formatted invoice.', count: payments.length },
    { href: '/customer/rentals/maintenance', icon: Wrench, title: 'Maintenance Requests', body: 'Report issues and track technicians.', count: maintenanceRequests.length },
    { href: '/customer/reviews', icon: Star, title: 'Reviews', body: 'Rate products you’ve rented.', count: null },
    { href: '/customer/notifications', icon: Bell, title: 'Notifications', body: 'Delivery updates, reminders, offers.', count: null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your rentals</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track everything about your rentals in one place.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card variant="glass" tilt className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                    <card.icon size={20} />
                  </span>
                  {card.count !== null && <Badge variant="brand">{card.count}</Badge>}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{card.title}</p>
                <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{card.body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                  Open <ArrowRight size={12} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
