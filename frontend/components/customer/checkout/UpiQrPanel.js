'use client';

import { motion } from 'framer-motion';
import { ScanLine, Copy } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useGetDemoUpiQrQuery } from '@/store/checkoutApi';
import { PAYMENT_METHODS } from '@/lib/checkoutMethods';

export default function UpiQrPanel({ methodId, amount, submitting, onConfirm }) {
  const { data, isLoading } = useGetDemoUpiQrQuery(amount, { skip: !amount });
  const qr = data?.data;
  const method = PAYMENT_METHODS.find((m) => m.id === methodId);

  const copyUpiId = async () => {
    if (!qr?.upiId) return;
    try {
      await navigator.clipboard.writeText(qr.upiId);
      toast.success('UPI ID copied.');
    } catch {
      toast.error('Could not copy UPI ID.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 p-5 text-center dark:border-white/10">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        <ScanLine size={15} className="text-brand-500" /> Scan with {method?.label || 'any UPI app'}
      </p>

      {isLoading || !qr ? (
        <Skeleton className="h-56 w-56 rounded-xl" />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="rounded-xl bg-white p-3 shadow-premium"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qrDataUrl} alt="UPI payment QR code" className="h-52 w-52" />
        </motion.div>
      )}

      {qr?.upiId && (
        <button
          type="button"
          onClick={copyUpiId}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
        >
          {qr.upiId} <Copy size={12} />
        </button>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Amount to pay: <span className="font-semibold text-slate-700 dark:text-slate-200">₹{amount.toLocaleString('en-IN')}</span>
      </p>

      <Button className="w-full sm:w-auto" loading={submitting} disabled={!qr} onClick={onConfirm}>
        {submitting ? 'Verifying payment…' : "I've completed the payment"}
      </Button>
    </div>
  );
}
