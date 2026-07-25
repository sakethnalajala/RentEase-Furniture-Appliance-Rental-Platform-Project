'use client';

import { motion } from 'framer-motion';
import { PAYMENT_METHODS } from '@/lib/checkoutMethods';

export default function PaymentMethodTiles({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon;
        const active = selected === method.id;
        return (
          <motion.button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition-colors ${
              active
                ? 'border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-400/10'
                : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white ${method.accent}`}>
              <Icon size={16} />
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">{method.label}</span>
            <span className="text-[10px] text-slate-400">{method.hint}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
