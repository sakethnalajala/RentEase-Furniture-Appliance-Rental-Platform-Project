'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Download, Eye } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useListMyPaymentsQuery } from '@/store/orderApi';
import { viewInvoice, downloadInvoice } from '@/lib/invoice';
import { toPaymentViewModel } from '@/lib/paymentViewModel';

export default function InvoicesPage() {
  const { data, isLoading } = useListMyPaymentsQuery();
  const payments = (data?.data || []).map(toPaymentViewModel);

  return (
    <div className="space-y-6">
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Rentals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Formatted, printable invoices for every payment.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {payments.map((payment) => (
            <Card key={payment.invoiceNumber} variant="glass" className="flex flex-col p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                <FileText size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{payment.invoiceNumber}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{payment.rental.product.name}</p>
              <p className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
                ₹{payment.total.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => viewInvoice(payment)}>
                  <Eye size={14} /> View
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
