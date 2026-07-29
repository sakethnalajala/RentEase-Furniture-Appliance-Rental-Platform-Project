'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ImageOff, Truck, CalendarClock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import RentalStatusBadge from '@/components/customer/RentalStatusBadge';
import { useListMyOrderItemsQuery } from '@/store/orderApi';

export default function CurrentRentalsPage() {
  const { data, isLoading } = useListMyOrderItemsQuery({ status: 'active_rental' });
  const activeRentals = (data?.data || []).map((item) => ({
    id: item.order?.orderNumber || item._id,
    product: item.product,
    status: 'active',
    rentalEnd: item.rentalEndDate,
    durationMonths: item.rentalPlan?.durationMonths,
    monthlyRent: item.monthlyRentalPrice,
  }));

  return (
    <div className="space-y-6">
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Rentals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Current Rentals</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Products you’re actively renting right now.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : activeRentals.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
          No active rentals right now.{' '}
          <Link href="/customer/browse" className="font-medium text-brand-600 dark:text-brand-400">
            Browse products
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeRentals.map((rental) => (
            <Card key={rental.id} variant="glass" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                {rental.product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rental.product.images[0]} alt={rental.product.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{rental.product.name}</p>
                  <RentalStatusBadge status={rental.status} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {rental.product.brand} · Order {rental.id}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CalendarClock size={12} /> Ends {new Date(rental.rentalEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck size={12} /> {rental.durationMonths}-month plan
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  ₹{rental.monthlyRent.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-slate-500">/mo</span>
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toast.info('Delivery tracking arrives with the order pipeline update.')}
                >
                  Track delivery
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
