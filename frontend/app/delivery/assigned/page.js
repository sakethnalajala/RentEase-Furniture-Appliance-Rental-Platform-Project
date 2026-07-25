'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, ImageOff, Check, X, Navigation, Phone, Building2, MapPin, KeyRound, PackageCheck, CircleDot, PartyPopper, Star,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import {
  useListAssignedDeliveriesQuery,
  useRejectAssignedDeliveryMutation,
  useMarkPickedUpMutation,
  useMarkDeliveredMutation,
} from '@/store/deliveryApi';
import { formatAddress, mapsSearchUrl, money } from '@/lib/deliveryHelpers';

const STEPS = ['Accepted', 'Picked Up', 'Delivered'];

function stepIndex(status) {
  if (status === 'out_for_delivery') return 1; // accepted + picked up done, delivered pending
  return 0; // 'preparing' — accepted done, pickup pending
}

function Timeline({ status }) {
  const current = stepIndex(status);
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                i <= current
                  ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-premium'
                  : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500'
              }`}
            >
              {i < current ? <Check size={13} /> : i === current ? <CircleDot size={13} /> : i + 1}
            </span>
            <span className="whitespace-nowrap text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-1.5 h-0.5 flex-1 rounded-full ${i < current ? 'bg-brand-500' : 'bg-slate-200 dark:bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Shows an animated "Delivery Successful" celebration for a beat before the modal closes and
// the item drops out of Assigned Deliveries (into History) — same spring/burst idiom as the
// customer checkout success screen (`components/customer/checkout/CheckoutSuccess.js`), so a
// completed delivery feels like a proper milestone rather than just a toast disappearing.
function DeliverySuccessState({ result, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-brand-500 text-white shadow-glow"
      >
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0.5, opacity: 0.55 }}
            animate={{ scale: 1.7 + i * 0.35, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.1 + i * 0.15, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border-2 border-emerald-400"
          />
        ))}
        <Check size={28} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <p className="flex items-center justify-center gap-1.5 font-display text-lg font-bold text-slate-900 dark:text-white">
          <PartyPopper size={17} className="text-amber-500" /> Delivery Successful
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Moved to your Delivery History — earned {money(result?.deliveryFee)}.
        </p>
      </motion.div>

      {result?.deliveryRating && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full rounded-xl border border-dashed border-emerald-400/50 bg-emerald-500/5 p-3 text-left"
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} className={i < result.deliveryRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'} />
            ))}
          </div>
          <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-300">&ldquo;{result.deliveryReviewComment}&rdquo;</p>
        </motion.div>
      )}
    </div>
  );
}

function OtpModal({ item, onClose, onSubmit, isLoading, successResult }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (item) setDigits(['', '', '', '']);
  }, [item]);

  const setDigit = (i, val) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 3) inputRefs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs[i - 1].current?.focus();
  };

  const handleSubmit = () => {
    const otp = digits.join('');
    if (otp.length !== 4) {
      toast.error('Enter the full 4-digit OTP.');
      return;
    }
    onSubmit(otp);
  };

  return (
    <Modal open={Boolean(item)} onClose={successResult ? undefined : onClose} title={successResult ? undefined : 'Verify delivery OTP'}>
      {successResult ? (
        <DeliverySuccessState result={successResult} onDone={onClose} />
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This is a demo platform — any 4-digit code confirms the delivery of{' '}
            <span className="font-medium text-slate-900 dark:text-white">{item?.product?.name}</span>.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                inputMode="numeric"
                maxLength={1}
                className="focus-ring h-14 w-12 rounded-xl border border-slate-300 bg-white/70 text-center text-xl font-bold text-slate-900 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button loading={isLoading} onClick={handleSubmit} className="flex-1">
              <KeyRound size={15} /> Confirm delivery
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function AssignedDeliveriesPage() {
  const { data, isLoading } = useListAssignedDeliveriesQuery();
  const [markPickedUp, { isLoading: isMarkingPickup }] = useMarkPickedUpMutation();
  const [rejectAssigned] = useRejectAssignedDeliveryMutation();
  const [markDelivered, { isLoading: isMarkingDelivered }] = useMarkDeliveredMutation();
  const [otpItem, setOtpItem] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [pickingUpId, setPickingUpId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const items = useMemo(() => data?.data || [], [data]);

  const handlePickup = async (item) => {
    setPickingUpId(item._id);
    try {
      await markPickedUp(item._id).unwrap();
      toast.success(`${item.product?.name} marked as picked up.`);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not mark as picked up.');
    } finally {
      setPickingUpId(null);
    }
  };

  // Backing out of an accepted-but-not-yet-picked-up delivery — fully cancels it (it will not
  // reappear in Delivery Requests for anyone), distinct from rejecting a still-open request.
  const handleRejectAssigned = async (item) => {
    setRejectingId(item._id);
    try {
      await rejectAssigned(item._id).unwrap();
      toast.success('Request Rejected — removed from your assigned deliveries.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not reject this delivery.');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeliverySubmit = async (otp) => {
    try {
      const result = await markDelivered({ itemId: otpItem._id, otp }).unwrap();
      toast.success('Delivery Completed Successfully');
      setSuccessResult(result.data);
    } catch (err) {
      toast.error(err?.data?.message || 'Incorrect delivery OTP.');
    }
  };

  const closeOtpModal = () => {
    setOtpItem(null);
    setSuccessResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Assigned deliveries</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {items.length} {items.length === 1 ? 'delivery' : 'deliveries'} currently in progress.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <Truck size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing assigned right now — accept a request to get started.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
          {items.map((item) => {
            const address = formatAddress(item.order?.deliveryAddress);
            const vendorAddress = item.vendor?.businessAddress || item.vendor?.warehouseLocation?.name;
            return (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >
              <Card variant="glass" className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  {item.product?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.product?.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Order {item.order?.orderNumber} · {money(item.deliveryFee)} delivery fee
                    </p>
                  </div>
                  <Badge variant={item.status === 'out_for_delivery' ? 'accent' : 'brand'} className="shrink-0">
                    {item.status === 'out_for_delivery' ? 'Out for delivery' : 'Accepted, awaiting pickup'}
                  </Badge>
                </div>

                <div className="mt-5">
                  <Timeline status={item.status} />
                </div>

                <div className="mt-5 grid gap-4 border-t border-slate-200/70 pt-4 dark:border-white/10 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <Building2 size={12} /> Pickup from
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{item.vendor?.businessName || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{vendorAddress || 'Address not available'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <MapPin size={12} /> Deliver to
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{item.order?.customer?.name || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{address || 'Address not available'}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {address && (
                    <a
                      href={mapsSearchUrl(address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/70 px-3.5 py-2 text-xs font-medium text-slate-600 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <Navigation size={13} /> Navigate
                    </a>
                  )}
                  {item.order?.customer?.phone && (
                    <a
                      href={`tel:${item.order.customer.phone}`}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/70 px-3.5 py-2 text-xs font-medium text-slate-600 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <Phone size={13} /> Contact customer
                    </a>
                  )}

                  <div className="ml-auto flex gap-2">
                    {item.status === 'preparing' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={rejectingId === item._id}
                          disabled={pickingUpId === item._id}
                          onClick={() => handleRejectAssigned(item)}
                        >
                          <X size={14} /> Reject
                        </Button>
                        <Button
                          size="sm"
                          loading={pickingUpId === item._id && isMarkingPickup}
                          disabled={rejectingId === item._id}
                          onClick={() => handlePickup(item)}
                        >
                          <PackageCheck size={14} /> Mark picked up
                        </Button>
                      </>
                    )}
                    {item.status === 'out_for_delivery' && (
                      <Button size="sm" onClick={() => setOtpItem(item)}>
                        <KeyRound size={14} /> Mark delivered
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      <OtpModal
        item={otpItem}
        onClose={closeOtpModal}
        onSubmit={handleDeliverySubmit}
        isLoading={isMarkingDelivered}
        successResult={successResult}
      />
    </div>
  );
}
