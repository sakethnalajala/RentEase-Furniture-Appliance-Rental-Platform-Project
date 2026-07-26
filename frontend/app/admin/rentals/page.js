'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { CalendarClock, ImageOff, AlertTriangle, Clock3, PackageCheck, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminListRentalsQuery } from '@/store/adminApi';
import { formatDate } from '@/lib/deliveryHelpers';

const TABS = [
  { key: 'current', label: 'Current rentals', icon: PackageCheck },
  { key: 'upcoming-returns', label: 'Upcoming returns', icon: Clock3 },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
];

const UPCOMING_RETURN_WINDOW_DAYS = 7;

function daysUntil(date) {
  if (!date) return null;
  const diffMs = new Date(date).getTime() - Date.now();
  return Math.ceil(diffMs / 86400000);
}

function RentalStatusChip({ endDate }) {
  const days = daysUntil(endDate);
  if (days === null) return null;

  if (days < 0) {
    return (
      <Badge variant="neutral" className="!bg-rose-100 !text-rose-700 dark:!bg-rose-500/15 dark:!text-rose-300">
        <AlertTriangle size={11} /> Overdue by {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'}
      </Badge>
    );
  }
  if (days <= UPCOMING_RETURN_WINDOW_DAYS) {
    return (
      <Badge variant="neutral" className="!bg-amber-100 !text-amber-700 dark:!bg-amber-500/15 dark:!text-amber-300">
        <Clock3 size={11} /> Due in {days} day{days === 1 ? '' : 's'}
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <PackageCheck size={11} /> Due in {days} days
    </Badge>
  );
}

export default function AdminRentalsPage() {
  const [filter, setFilter] = useState('current');
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data, isLoading } = useAdminListRentalsQuery({ filter, days: UPCOMING_RETURN_WINDOW_DAYS, city: selectedCity?.id });

  const payload = data?.data;
  const items = payload?.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Rental Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Active rentals across the platform, with returns and overdue tracking.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === t.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {filter === 'upcoming-returns' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Info size={12} /> Shows rentals due back within the next {UPCOMING_RETURN_WINDOW_DAYS} days.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <CalendarClock size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filter === 'overdue' ? 'No overdue rentals — everything is on track.' : 'No rentals match this view.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const overdue = daysUntil(item.rentalEndDate) < 0;
            return (
              <Card
                key={item._id}
                variant="glass"
                className={`flex flex-wrap items-center gap-4 p-4 ${
                  overdue ? 'ring-1 ring-rose-400/50 dark:ring-rose-500/30' : ''
                }`}
              >
                {item.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.images[0]} alt={item.product.name} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={18} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.product?.name || '—'}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.order?.customer?.name} · {item.vendor?.businessName || 'RentEase'}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  <p>Start: {formatDate(item.rentalStartDate)}</p>
                  <p className={overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
                    End: {formatDate(item.rentalEndDate)}
                  </p>
                </div>

                <RentalStatusChip endDate={item.rentalEndDate} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
