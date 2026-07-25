'use client';

import { Banknote } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function CodPanel({ amount, submitting, onConfirm }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 p-5 text-center dark:border-white/10">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Banknote size={22} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Cash on Delivery</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Pay ₹{amount.toLocaleString('en-IN')} in cash when your order is delivered.
        </p>
      </div>
      <Button className="w-full sm:w-auto" loading={submitting} onClick={onConfirm}>
        Confirm order
      </Button>
    </div>
  );
}
