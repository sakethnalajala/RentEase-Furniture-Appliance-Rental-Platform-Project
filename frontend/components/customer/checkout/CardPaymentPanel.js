'use client';

import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const formatCardNumber = (value) =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

function validate(card) {
  const errors = {};
  const digits = card.number.replace(/\s/g, '');
  if (digits.length < 13 || digits.length > 19) errors.number = 'Enter a valid card number.';

  const [mm, yy] = card.expiry.split('/');
  if (!mm || !yy || yy.length !== 2 || Number(mm) < 1 || Number(mm) > 12) {
    errors.expiry = 'Enter a valid expiry (MM/YY).';
  } else {
    const now = new Date();
    const expiryDate = new Date(2000 + Number(yy), Number(mm)); // first day of month after expiry
    if (expiryDate <= now) errors.expiry = 'This card has expired.';
  }

  if (card.cvv.length < 3 || card.cvv.length > 4) errors.cvv = 'Enter a valid CVV.';
  if (!card.name.trim()) errors.name = 'Enter the cardholder name.';

  return errors;
}

export default function CardPaymentPanel({ amount, submitting, onConfirm }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validate(card);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onConfirm();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 p-5 dark:border-white/10">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        <CreditCard size={15} className="text-brand-500" /> Card details
      </p>

      <Input
        label="Card number"
        placeholder="1234 5678 9012 3456"
        inputMode="numeric"
        value={card.number}
        onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
        error={errors.number}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Expiry (MM/YY)"
          placeholder="MM/YY"
          inputMode="numeric"
          value={card.expiry}
          onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
          error={errors.expiry}
        />
        <Input
          label="CVV"
          placeholder="123"
          inputMode="numeric"
          type="password"
          maxLength={4}
          value={card.cvv}
          onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
          error={errors.cvv}
        />
      </div>
      <Input
        label="Cardholder name"
        placeholder="Name on card"
        value={card.name}
        onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
        error={errors.name}
      />

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Lock size={11} /> Demo form — format/length validated only, no real card is charged.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Amount to pay: <span className="font-semibold text-slate-700 dark:text-slate-200">₹{amount.toLocaleString('en-IN')}</span>
      </p>

      <Button type="submit" className="w-full" loading={submitting}>
        {submitting ? 'Processing payment…' : 'Place Your Order'}
      </Button>
    </form>
  );
}
