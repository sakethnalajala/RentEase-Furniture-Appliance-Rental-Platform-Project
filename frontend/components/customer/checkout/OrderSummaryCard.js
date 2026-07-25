'use client';

import { ImageOff, ShieldCheck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

function Row({ label, value, muted = false, emphasize = false }) {
  return (
    <div
      className={`flex justify-between ${
        emphasize
          ? 'font-display text-lg font-bold text-slate-900 dark:text-white'
          : muted
            ? 'text-xs text-slate-500 dark:text-slate-400'
            : 'text-sm text-slate-600 dark:text-slate-300'
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function OrderSummaryCard({ items, totals }) {
  const { totalMonthlyRental, totalSecurityDeposit, totalDeliveryCharge, gstAmount, grandTotalDue } = totals;

  return (
    <Card variant="glass" className="space-y-5 p-5">
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Order summary</h2>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={`${item.productId}-${item.rentalPlanId}-${i}`} className="flex gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                  <ImageOff size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="neutral" className="!px-2 !py-0.5 text-[10px]">
                  {item.rentalPlanLabel} plan
                </Badge>
                {item.discountPercent > 0 && (
                  <Badge variant="success" className="!px-2 !py-0.5 text-[10px]">
                    {item.discountPercent}% off
                  </Badge>
                )}
                <span className="text-[11px] text-slate-400">Qty {item.quantity}</span>
              </div>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
              ₹{(item.monthlyRentalPrice * item.quantity).toLocaleString('en-IN')}
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">/mo</span>
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
        <Row label="Monthly Rental" value={`₹${totalMonthlyRental.toLocaleString('en-IN')}`} />
        <Row label="Security Deposit" value={`₹${totalSecurityDeposit.toLocaleString('en-IN')}`} />
        <Row label="Delivery Charges" value={totalDeliveryCharge > 0 ? `₹${totalDeliveryCharge.toLocaleString('en-IN')}` : 'Free'} />
        <Row label="GST (18%)" value={`₹${gstAmount.toLocaleString('en-IN')}`} />
        <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck size={13} /> Deposit is fully refundable on return
        </div>
      </div>

      <div className="border-t border-slate-200/70 pt-3 dark:border-white/10">
        <Row label="Total Amount" value={`₹${grandTotalDue.toLocaleString('en-IN')}`} emphasize />
      </div>
    </Card>
  );
}
