'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, PartyPopper, KeyRound, Truck, Hash, ArrowRight, Compass } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function CheckoutSuccess({ order, items }) {
  const router = useRouter();
  const isCod = order.paymentMethod === 'cod';
  const maxDeliveryDays = items.reduce((max, item) => Math.max(max, item.product?.estimatedDeliveryDays || 0), 0);

  return (
    <div className="mx-auto max-w-2xl">
      <Card variant="glass" className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
        <motion.div
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-brand-500 text-white shadow-glow"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0.5, opacity: 0.55 }}
              animate={{ scale: 1.7 + i * 0.35, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.15 + i * 0.15, ease: 'easeOut', repeat: 2, repeatDelay: 0.6 }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
            />
          ))}
          <CheckCircle2 size={36} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {isCod ? 'Order Confirmed — Pay on Delivery' : 'Payment Successful'}
          </h1>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
            <PartyPopper size={15} /> Rental Confirmed
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="grid w-full gap-3 sm:grid-cols-2"
        >
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 text-left dark:border-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300">
              <Hash size={16} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Order ID</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 text-left dark:border-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-300">
              <Truck size={16} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Estimated delivery</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {maxDeliveryDays > 0 ? `Arriving in ~${maxDeliveryDays} day${maxDeliveryDays > 1 ? 's' : ''}` : 'Delivery scheduled soon'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
          className="w-full space-y-2 rounded-xl border border-dashed border-brand-400/50 bg-brand-500/5 p-4 text-left dark:bg-brand-400/5"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
            <KeyRound size={13} /> Delivery OTP{items.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{item.product?.name}</span>
                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 font-mono text-base font-bold tracking-widest text-slate-900 shadow-sm dark:bg-slate-900/80 dark:text-white">
                  {item.deliveryOtp}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Share this code with your delivery partner when your order arrives — it confirms the handover.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.4 }}
          className="flex w-full flex-col gap-2.5 pt-1 sm:flex-row"
        >
          <Button className="w-full flex-1" onClick={() => router.push('/customer/rentals/current')}>
            View my rentals <ArrowRight size={15} />
          </Button>
          <Button variant="secondary" className="w-full flex-1" onClick={() => router.push('/customer/browse')}>
            <Compass size={15} /> Continue browsing
          </Button>
        </motion.div>
      </Card>
    </div>
  );
}
