'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Minus, Plus, Trash2, ImageOff, ShieldCheck, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useGetCartQuery, useUpdateCartItemMutation, useRemoveCartItemMutation } from '@/store/customerApi';
import { setCheckoutDraft } from '@/store/checkoutSlice';

function SelectCheckbox({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      aria-label={ariaLabel}
      className={`focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
        checked
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-300 bg-white/60 text-transparent hover:border-brand-400 dark:border-white/20 dark:bg-white/5'
      }`}
    >
      <motion.span
        initial={false}
        animate={checked ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex"
      >
        <Check size={13} strokeWidth={3} />
      </motion.span>
    </button>
  );
}

export default function CartPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { data, isLoading } = useGetCartQuery();
  const [updateItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeItem, { isLoading: isRemoving }] = useRemoveCartItemMutation();

  const items = data?.data?.items || [];
  // itemId -> boolean, defaults every item (including newly-loaded ones) to checked so the
  // "select at least one" behavior matches today's implicit "whole cart" checkout.
  const [selected, setSelected] = useState({});
  const idsKey = items.map((i) => i._id).join(',');

  useEffect(() => {
    setSelected((prev) => {
      const next = {};
      items.forEach((item) => {
        next[item._id] = item._id in prev ? prev[item._id] : true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const selectedItems = items.filter((item) => selected[item._id]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleAll = () => {
    const next = {};
    items.forEach((item) => {
      next[item._id] = !allSelected;
    });
    setSelected(next);
  };

  const toggleOne = (itemId) => {
    setSelected((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const discountedMonthly = (item) =>
    Math.round(item.monthlyRentalPrice * (1 - (item.rentalPlan?.discountPercent || 0) / 100)) * item.quantity;

  const totalMonthly = selectedItems.reduce((sum, item) => sum + discountedMonthly(item), 0);
  const totalDeposit = selectedItems.reduce((sum, item) => sum + item.securityDeposit * item.quantity, 0);

  const handleQuantity = async (item, delta) => {
    const quantity = item.quantity + delta;
    if (quantity < 1) return;
    try {
      await updateItem({ itemId: item._id, quantity }).unwrap();
    } catch {
      toast.error('Could not update quantity.');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeItem(itemId).unwrap();
      toast.success('Removed from cart.');
    } catch {
      toast.error('Could not remove item.');
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    const draft = selectedItems.map((item) => ({
      cartItemId: item._id,
      productId: item.product?._id,
      name: item.product?.name,
      image: item.product?.images?.[0] || null,
      subCategory: item.product?.subCategory,
      brand: item.product?.brand,
      city: item.product?.city ? { id: item.product.city._id, name: item.product.city.name } : null,
      rentalPlanId: item.rentalPlan?._id,
      rentalPlanLabel: item.rentalPlan?.label,
      discountPercent: item.rentalPlan?.discountPercent || 0,
      unitMonthlyRentalPrice: item.monthlyRentalPrice,
      monthlyRentalPrice: Math.round(item.monthlyRentalPrice * (1 - (item.rentalPlan?.discountPercent || 0) / 100)),
      securityDeposit: item.securityDeposit,
      deliveryCharge: item.product?.deliveryCharge || 0,
      installationRequired: item.product?.installationRequired || false,
      estimatedDeliveryDays: item.product?.estimatedDeliveryDays,
      quantity: item.quantity,
    }));
    dispatch(setCheckoutDraft(draft));
    router.push('/customer/checkout');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
        <ShoppingCart size={32} className="text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Your cart is empty.</p>
        <Link href="/customer/browse" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Browse products
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your cart</h1>
          <div className="flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <SelectCheckbox checked={allSelected} onChange={toggleAll} ariaLabel="Select all items" />
            <button type="button" onClick={toggleAll} className="focus-ring rounded hover:text-slate-700 dark:hover:text-slate-200">
              Select all ({selectedItems.length}/{items.length})
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item._id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            >
              <Card variant="glass" className={`flex gap-3 p-4 transition-opacity sm:gap-4 ${selected[item._id] ? '' : 'opacity-60'}`}>
                <div className="flex shrink-0 items-start pt-1">
                  <SelectCheckbox
                    checked={!!selected[item._id]}
                    onChange={() => toggleOne(item._id)}
                    ariaLabel={`Select ${item.product?.name || 'item'}`}
                  />
                </div>

                <Link href={`/customer/browse/${item.product?._id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  {item.product?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={20} />
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/customer/browse/${item.product?._id}`} className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.product?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.rentalPlan?.label} plan
                        {item.rentalPlan?.discountPercent > 0 && ` · ${item.rentalPlan.discountPercent}% off`}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(item._id)}
                      disabled={isRemoving}
                      aria-label="Remove item"
                      className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 px-1.5 py-1 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => handleQuantity(item, -1)}
                        disabled={isUpdating}
                        className="focus-ring flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantity(item, 1)}
                        disabled={isUpdating}
                        className="focus-ring flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                      ₹{discountedMonthly(item).toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/mo</span>
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div>
        <Card variant="glass" className="sticky top-24 space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Monthly rental</span>
              <span>₹{totalMonthly.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Security deposit</span>
              <span>₹{totalDeposit.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} /> Deposit is fully refundable on return
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-200/70 pt-3 font-display text-lg font-bold text-slate-900 dark:border-white/10 dark:text-white">
            <span>Due today</span>
            <span>₹{(totalMonthly + totalDeposit).toLocaleString('en-IN')}</span>
          </div>
          <Button className="w-full" disabled={selectedItems.length === 0} onClick={handleCheckout}>
            Proceed to Checkout
          </Button>
          {selectedItems.length === 0 && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">Select at least one item to continue.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
