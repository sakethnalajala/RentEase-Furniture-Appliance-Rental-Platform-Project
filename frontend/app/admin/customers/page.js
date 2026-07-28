'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Search, Users, ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, MapPin, Wallet, CalendarClock, Receipt, Clock3 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminListCustomersQuery } from '@/store/adminApi';
import { money, formatDate, formatDateTime } from '@/lib/deliveryHelpers';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { LIVE_POLL_MS } from '@/lib/livePoll';

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'spending_desc', label: 'Highest Spending' },
  { value: 'orders_desc', label: 'Most Orders' },
];

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const selectedCity = useSelector((state) => state.city.selectedCity);

  useEffect(() => setPage(1), [debouncedSearch, sort]);

  const { data, isLoading, isFetching } = useAdminListCustomersQuery(
    {
      search: debouncedSearch || undefined,
      sort,
      page,
      limit: 20,
      city: selectedCity?.id,
    },
    { pollingInterval: LIVE_POLL_MS }
  );

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeInUp}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Customer management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {total.toLocaleString('en-IN')} registered customers on the platform.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card variant="glass" className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Select value={sort} onChange={setSort} options={SORT_OPTIONS} className="w-full sm:w-52" />
          </div>

          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
            <Users size={32} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No customers match your search.</p>
          </Card>
        ) : (
          <div className={`space-y-2.5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {items.map((customer) => (
              <Link key={customer._id} href={`/admin/customers/${customer._id}`}>
                <Card variant="glass" hover className="flex flex-wrap items-center gap-4 p-4">
                  {customer.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.avatar} alt={customer.name} className="h-11 w-11 shrink-0 rounded-full object-cover shadow-premium" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium">
                      {initials(customer.name)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {customer.email}
                      {customer.phone && ` · ${customer.phone}`}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      <span>Joined {formatDate(customer.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {customer.selectedCity?.name || customer.address?.city?.name || 'No city set'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 size={11} />
                        {customer.lastLoginAt ? `Last login ${formatDateTime(customer.lastLoginAt)}` : 'Never logged in'}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <Badge variant={customer.isActive === false ? 'accent' : 'success'}>
                      {customer.isActive === false ? 'Inactive' : 'Active'}
                    </Badge>
                    <Badge variant="brand">
                      <ShoppingBag size={11} /> {customer.totalOrders ?? 0} orders
                    </Badge>
                    {customer.activeRentals > 0 && (
                      <Badge variant="accent">
                        <CalendarClock size={11} /> {customer.activeRentals} active
                      </Badge>
                    )}
                    <Badge variant="neutral">
                      <Receipt size={11} /> {customer.totalPayments ?? 0} payments
                    </Badge>
                    <Badge variant="neutral">
                      <Wallet size={11} /> {money(customer.totalSpending)}
                    </Badge>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-slate-400" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {items.length > 0 && pages > 1 && (
        <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 disabled:opacity-40 dark:border-white/10"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 disabled:opacity-40 dark:border-white/10"
          >
            <ChevronRight size={16} />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
