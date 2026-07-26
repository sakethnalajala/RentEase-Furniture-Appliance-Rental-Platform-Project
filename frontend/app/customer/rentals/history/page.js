'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImageOff, RotateCcw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import RentalStatusBadge from '@/components/customer/RentalStatusBadge';
import { useMockRentals } from '@/hooks/useMockRentals';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function RentalHistoryPage() {
  const { isLoading, rentalHistory } = useMockRentals();
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Rentals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Rental History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything you’ve rented, past and present.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rentalHistory.map((rental) => (
            <Card key={rental.id} variant="glass" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                {rental.product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rental.product.images[0]} alt={rental.product.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={16} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{rental.product.name}</p>
                  <RentalStatusBadge status={rental.status} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(rental.rentalStart)} → {formatDate(rental.rentalEnd)} · {rental.durationMonths} mo
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  ₹{rental.monthlyRent.toLocaleString('en-IN')}/mo
                </p>
                <Button size="sm" variant="ghost" onClick={() => setSelected(rental)}>
                  View
                </Button>
                <Link href={`/customer/browse/${rental.product._id}`}>
                  <Button size="sm" variant="secondary">
                    <RotateCcw size={13} /> Rent Again
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Rental details">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.product.images?.[0]} alt={selected.product.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{selected.product.name}</p>
                <RentalStatusBadge status={selected.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <Row label="Order ID" value={selected.id} />
              <Row label="Duration" value={`${selected.durationMonths} months`} />
              <Row label="Rental start" value={formatDate(selected.rentalStart)} />
              <Row label="Rental end" value={formatDate(selected.rentalEnd)} />
              <Row label="Monthly rent" value={`₹${selected.monthlyRent.toLocaleString('en-IN')}`} />
              <Row label="Security deposit" value={`₹${selected.deposit.toLocaleString('en-IN')}`} />
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}
