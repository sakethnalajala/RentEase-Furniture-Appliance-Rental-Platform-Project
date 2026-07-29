'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Download, Printer, CreditCard } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useListMyPaymentsQuery } from '@/store/orderApi';
import { printInvoice, downloadInvoice } from '@/lib/invoice';
import { toPaymentViewModel } from '@/lib/paymentViewModel';

const STATUS_VARIANT = { paid: 'success', refunded: 'accent', partially_refunded: 'accent', failed: 'accent', pending: 'neutral' };

export default function PaymentHistoryPage() {
  const { data, isLoading } = useListMyPaymentsQuery();
  const payments = (data?.data || []).map(toPaymentViewModel);

  return (
    <div className="space-y-6">
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Rentals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Payment History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All transactions across your rentals.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-2 p-12 text-center">
          <CreditCard size={28} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No payments yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card key={payment.invoiceNumber} variant="glass" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{payment.invoiceNumber}</p>
                  <Badge variant={STATUS_VARIANT[payment.paymentStatus]}>{payment.paymentStatus}</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Order {payment.orderId} · {payment.paymentMethod} · TXN {payment.transactionId}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    ₹{payment.total.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-400">
                    Rent ₹{payment.rentalAmount.toLocaleString('en-IN')} + Deposit ₹{payment.securityDeposit.toLocaleString('en-IN')}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => printInvoice(payment)}>
                  <Printer size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    downloadInvoice(payment);
                    toast.success('Invoice downloaded.');
                  }}
                >
                  <Download size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
