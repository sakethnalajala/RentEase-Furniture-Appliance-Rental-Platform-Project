'use client';

import { useState } from 'react';
import { Landmark } from 'lucide-react';
import Button from '@/components/ui/Button';
import { BANKS } from '@/lib/checkoutMethods';

export default function NetBankingPanel({ amount, submitting, onConfirm }) {
  const [bank, setBank] = useState(null);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-5 dark:border-white/10">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        <Landmark size={15} className="text-brand-500" /> Select your bank
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BANKS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setBank(name)}
            className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
              bank === name
                ? 'border-brand-500 bg-brand-50 text-slate-900 dark:border-brand-400/60 dark:bg-brand-400/10 dark:text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <Button className="w-full" disabled={!bank} loading={submitting} onClick={onConfirm}>
        {submitting ? 'Redirecting to bank…' : bank ? 'Place Your Order' : 'Select a bank to continue'}
      </Button>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Amount to pay: <span className="font-semibold text-slate-700 dark:text-slate-200">₹{amount.toLocaleString('en-IN')}</span>
      </p>
    </div>
  );
}
