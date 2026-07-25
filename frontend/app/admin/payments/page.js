'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Wallet, RotateCcw, CreditCard, Receipt, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminListPaymentsQuery, useAdminGetPaymentsSummaryQuery } from '@/store/adminApi';
import { MagnitudeBarChart, CountUpNumber } from '@/components/vendor/AnalyticsCharts';
import { formatDate, money } from '@/lib/deliveryHelpers';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially refunded' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'net_banking', label: 'Net banking' },
  { value: 'cod', label: 'Cash on delivery' },
];

const METHOD_LABELS = Object.fromEntries(METHOD_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));

const PAYMENT_STATUS_STYLE = {
  pending: 'neutral',
  paid: 'success',
  failed: 'accent',
  refunded: 'brand',
  partially_refunded: 'brand',
};

const PAYMENT_STATUS_OVERRIDE = {
  failed: '!bg-rose-100 !text-rose-700 dark:!bg-rose-500/15 dark:!text-rose-300',
};

function PaymentStatusBadge({ status }) {
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
  return (
    <Badge variant={PAYMENT_STATUS_STYLE[status] || 'neutral'} className={PAYMENT_STATUS_OVERRIDE[status] || ''}>
      {label}
    </Badge>
  );
}

const PAGE_SIZE = 20;

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const selectedCity = useSelector((state) => state.city.selectedCity);

  const { data: summaryData, isLoading: summaryLoading } = useAdminGetPaymentsSummaryQuery({ city: selectedCity?.id });
  const { data: listData, isLoading: listLoading, isFetching } = useAdminListPaymentsQuery({ status, method, page, limit: PAGE_SIZE, city: selectedCity?.id });

  const summary = summaryData?.data;
  const payload = listData?.data;
  const items = payload?.items || [];
  const totalPages = payload?.pages || 1;

  const methodBars = summary?.byMethod
    ? Object.entries(summary.byMethod)
        .map(([key, v]) => ({ label: METHOD_LABELS[key] || key, value: v.total }))
        .sort((a, b) => b.value - a.value)
    : [];

  const handleFilter = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Payments</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Platform-wide revenue, refunds and transaction history.</p>
      </div>

      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="glass" className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet size={18} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">
              <CountUpNumber value={summary?.totalRevenue || 0} prefix="₹" />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total revenue (paid)</p>
          </Card>
          <Card variant="glass" className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <RotateCcw size={18} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">
              <CountUpNumber value={summary?.totalRefunded || 0} prefix="₹" />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total refunded</p>
          </Card>
          <Card variant="glass" className="p-5 lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
              <CreditCard size={18} />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue by method</p>
            <div className="mt-3">
              {methodBars.length > 0 ? (
                <MagnitudeBarChart data={methodBars} formatValue={money} />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No payment activity yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="glass" className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Filter size={13} /> Filter
        </span>
        <Select value={status} onChange={handleFilter(setStatus)} options={STATUS_OPTIONS} className="w-48" />
        <Select value={method} onChange={handleFilter(setMethod)} options={METHOD_OPTIONS} className="w-48" />
      </Card>

      {/* Transaction table */}
      {listLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <Receipt size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No transactions match these filters.</p>
        </Card>
      ) : (
        <Card variant="glass" className={`overflow-hidden p-0 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{p.user?.name || '—'}</p>
                      <p className="truncate text-xs text-slate-400">{p.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.order?.orderNumber || '—'}</td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{p.type?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{METHOD_LABELS[p.method] || p.method}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!listLoading && items.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
