'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CreditCard } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useListAddressesQuery } from '@/store/customerApi';
import { useCheckoutMutation } from '@/store/orderApi';
import { clearCheckoutDraft } from '@/store/checkoutSlice';
import { PAYMENT_METHODS, resolveBackendPaymentMethod } from '@/lib/checkoutMethods';
import OrderSummaryCard from '@/components/customer/checkout/OrderSummaryCard';
import DeliveryAddressCard from '@/components/customer/checkout/DeliveryAddressCard';
import PaymentMethodTiles from '@/components/customer/checkout/PaymentMethodTiles';
import UpiQrPanel from '@/components/customer/checkout/UpiQrPanel';
import CardPaymentPanel from '@/components/customer/checkout/CardPaymentPanel';
import NetBankingPanel from '@/components/customer/checkout/NetBankingPanel';
import CodPanel from '@/components/customer/checkout/CodPanel';
import CheckoutSuccess from '@/components/customer/checkout/CheckoutSuccess';

const EMPTY_ADDRESS_FORM = { contactName: '', contactPhone: '', addressLine1: '', addressLine2: '', state: '', pincode: '' };

function validateAddress(form) {
  const errors = {};
  if (!form.contactName.trim()) errors.contactName = 'Required';
  if (!form.contactPhone.trim()) errors.contactPhone = 'Required';
  if (!form.addressLine1.trim()) errors.addressLine1 = 'Required';
  if (!form.state.trim()) errors.state = 'Required';
  if (!form.pincode.trim()) errors.pincode = 'Required';
  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const draftItems = useSelector((state) => state.checkout.items);
  const { data: addressesData } = useListAddressesQuery();
  const [checkout] = useCheckoutMutation();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressErrors, setAddressErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null); // { order, items } once checkout resolves

  const addresses = addressesData?.data || [];
  const cityName = draftItems[0]?.city?.name || '';

  // Redirect back to Cart if there's nothing to check out (stray refresh, cleared session,
  // or a back-navigation after a completed order already cleared the draft).
  useEffect(() => {
    if (!successResult && draftItems.length === 0) {
      toast.error('Your checkout session is empty — pick items to continue.');
      router.replace('/customer/cart');
    }
  }, [successResult, draftItems.length, router]);

  // Prefill from the customer's default (or first) saved address once, so it doesn't stomp
  // over edits the user has already started making.
  useEffect(() => {
    if (hasPrefilled || addresses.length === 0) return;
    const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress._id);
      setAddressForm({
        contactName: defaultAddress.contactName || '',
        contactPhone: defaultAddress.contactPhone || '',
        addressLine1: defaultAddress.addressLine1 || '',
        addressLine2: defaultAddress.addressLine2 || '',
        state: defaultAddress.state || '',
        pincode: defaultAddress.pincode || '',
      });
    }
    setHasPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.length, hasPrefilled]);

  const totals = useMemo(() => {
    const totalMonthlyRental = draftItems.reduce((sum, i) => sum + i.monthlyRentalPrice * i.quantity, 0);
    const totalSecurityDeposit = draftItems.reduce((sum, i) => sum + i.securityDeposit * i.quantity, 0);
    const totalDeliveryCharge = draftItems.reduce((sum, i) => sum + (i.deliveryCharge || 0), 0);
    const gstAmount = Math.round(totalMonthlyRental * 0.18);
    const grandTotalDue = totalMonthlyRental + totalSecurityDeposit + totalDeliveryCharge + gstAmount;
    return { totalMonthlyRental, totalSecurityDeposit, totalDeliveryCharge, gstAmount, grandTotalDue };
  }, [draftItems]);

  const handlePickSavedAddress = (address) => {
    setSelectedAddressId(address._id);
    setAddressForm({
      contactName: address.contactName || '',
      contactPhone: address.contactPhone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      state: address.state || '',
      pincode: address.pincode || '',
    });
  };

  const handleAddressFieldChange = (key, value) => {
    setAddressForm((f) => ({ ...f, [key]: value }));
  };

  const runCheckout = async ({ simulateDelayMs = 0 } = {}) => {
    const errors = validateAddress(addressForm);
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please complete your delivery address.');
      return;
    }
    if (!cityName || draftItems.length === 0) {
      toast.error('Your checkout session is empty — please try again from your cart.');
      return;
    }

    setSubmitting(true);
    try {
      if (simulateDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, simulateDelayMs));

      const payload = {
        items: draftItems.map((i) => ({ productId: i.productId, rentalPlanId: i.rentalPlanId, quantity: i.quantity })),
        deliveryAddress: {
          contactName: addressForm.contactName,
          contactPhone: addressForm.contactPhone,
          addressLine1: addressForm.addressLine1,
          addressLine2: addressForm.addressLine2,
          city: cityName,
          state: addressForm.state,
          pincode: addressForm.pincode,
        },
        paymentMethod: resolveBackendPaymentMethod(paymentMethod),
        clearCartItemIds: draftItems.map((i) => i.cartItemId).filter(Boolean),
      };

      const res = await checkout(payload).unwrap();
      setSuccessResult(res.data);
      dispatch(clearCheckoutDraft());
    } catch (err) {
      toast.error(err?.data?.message || 'Checkout failed — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return <CheckoutSuccess order={successResult.order} items={successResult.items} />;
  }

  if (draftItems.length === 0) return null;

  const family = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.family;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DeliveryAddressCard
            cityName={cityName}
            form={addressForm}
            onFieldChange={handleAddressFieldChange}
            savedAddresses={addresses}
            selectedAddressId={selectedAddressId}
            onPickSaved={handlePickSavedAddress}
            errors={addressErrors}
          />

          <Card variant="glass" className="space-y-4 p-5">
            <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-slate-900 dark:text-white">
              <CreditCard size={17} className="text-brand-500" /> Payment method
            </h2>
            <PaymentMethodTiles selected={paymentMethod} onSelect={setPaymentMethod} />

            <AnimatePresence mode="wait">
              <motion.div
                key={paymentMethod}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="pt-1"
              >
                {family === 'upi' && (
                  <UpiQrPanel
                    methodId={paymentMethod}
                    amount={totals.grandTotalDue}
                    submitting={submitting}
                    onConfirm={() => runCheckout({ simulateDelayMs: 1300 })}
                  />
                )}
                {family === 'card' && (
                  <CardPaymentPanel
                    amount={totals.grandTotalDue}
                    submitting={submitting}
                    onConfirm={() => runCheckout({ simulateDelayMs: 1500 })}
                  />
                )}
                {family === 'net_banking' && (
                  <NetBankingPanel
                    amount={totals.grandTotalDue}
                    submitting={submitting}
                    onConfirm={() => runCheckout({ simulateDelayMs: 1500 })}
                  />
                )}
                {family === 'cod' && (
                  <CodPanel amount={totals.grandTotalDue} submitting={submitting} onConfirm={() => runCheckout()} />
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>

        <div>
          <div className="sticky top-24">
            <OrderSummaryCard items={draftItems} totals={totals} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
