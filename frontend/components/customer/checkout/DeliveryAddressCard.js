'use client';

import { MapPin, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

export default function DeliveryAddressCard({ cityName, form, onFieldChange, savedAddresses, selectedAddressId, onPickSaved, errors }) {
  return (
    <Card variant="glass" className="space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Delivery address</h2>

      {savedAddresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Saved addresses</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {savedAddresses.map((address) => (
              <button
                key={address._id}
                type="button"
                onClick={() => onPickSaved(address)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedAddressId === address._id
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-400/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                  <MapPin size={12} className="text-brand-500" /> {address.label}
                  {address.isDefault && <Star size={11} className="fill-emerald-500 text-emerald-500" />}
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {address.contactName} · {address.addressLine1}, {address.city?.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Contact name"
          required
          value={form.contactName}
          onChange={(e) => onFieldChange('contactName', e.target.value)}
          error={errors.contactName}
        />
        <Input
          label="Contact phone"
          required
          value={form.contactPhone}
          onChange={(e) => onFieldChange('contactPhone', e.target.value)}
          error={errors.contactPhone}
        />
      </div>
      <Input
        label="Address line 1"
        required
        value={form.addressLine1}
        onChange={(e) => onFieldChange('addressLine1', e.target.value)}
        error={errors.addressLine1}
      />
      <Input
        label="Address line 2 (optional)"
        value={form.addressLine2}
        onChange={(e) => onFieldChange('addressLine2', e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">City</label>
          <input
            disabled
            value={cityName || ''}
            readOnly
            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          />
          <p className="text-[11px] text-slate-400">Fixed — matches where your order ships from.</p>
        </div>
        <Input label="State" required value={form.state} onChange={(e) => onFieldChange('state', e.target.value)} error={errors.state} />
        <Input
          label="Pincode"
          required
          value={form.pincode}
          onChange={(e) => onFieldChange('pincode', e.target.value)}
          error={errors.pincode}
        />
      </div>
    </Card>
  );
}
