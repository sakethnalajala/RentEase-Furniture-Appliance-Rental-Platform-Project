import { Smartphone, Zap, Wallet, QrCode, CreditCard, Landmark, Banknote } from 'lucide-react';

// UI-level payment tiles shown at checkout. PhonePe / Google Pay / Paytm / UPI all ride the
// same UPI rails on the backend (there's only one `upi` payment method server-side) — the
// distinct tiles are purely a front-end presentation choice per the product spec.
export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', hint: 'Any UPI app', icon: Smartphone, accent: 'from-indigo-500 to-violet-500', family: 'upi' },
  { id: 'phonepe', label: 'PhonePe', hint: 'Pay via PhonePe', icon: Zap, accent: 'from-violet-600 to-purple-500', family: 'upi' },
  { id: 'gpay', label: 'Google Pay', hint: 'Pay via GPay', icon: Wallet, accent: 'from-sky-500 to-emerald-500', family: 'upi' },
  { id: 'paytm', label: 'Paytm', hint: 'Pay via Paytm', icon: QrCode, accent: 'from-sky-600 to-blue-600', family: 'upi' },
  { id: 'credit_card', label: 'Credit Card', hint: 'Visa, Mastercard, Rupay', icon: CreditCard, accent: 'from-amber-500 to-orange-500', family: 'card' },
  { id: 'debit_card', label: 'Debit Card', hint: 'Visa, Mastercard, Rupay', icon: CreditCard, accent: 'from-emerald-500 to-teal-500', family: 'card' },
  { id: 'net_banking', label: 'Net Banking', hint: 'All major banks', icon: Landmark, accent: 'from-slate-500 to-slate-700', family: 'net_banking' },
  { id: 'cod', label: 'Cash on Delivery', hint: 'Pay when delivered', icon: Banknote, accent: 'from-emerald-600 to-brand-500', family: 'cod' },
];

export const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank'];

// Maps the UI-level tile id to the one of five values the backend's checkout endpoint
// actually accepts.
export function resolveBackendPaymentMethod(uiMethodId) {
  const method = PAYMENT_METHODS.find((m) => m.id === uiMethodId);
  if (!method) return 'upi';
  if (method.family === 'upi') return 'upi';
  return method.id; // credit_card | debit_card | net_banking | cod
}
