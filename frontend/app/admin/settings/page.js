'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings as SettingsIcon, FileText, CalendarRange, Save } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Skeleton from '@/components/ui/Skeleton';
import {
  useAdminGetSettingsQuery,
  useAdminUpdateSettingsMutation,
  useAdminListRentalPlansQuery,
  useAdminUpsertRentalPlanMutation,
} from '@/store/adminApi';

const TABS = [
  { key: 'general', label: 'General & Fees', icon: SettingsIcon },
  { key: 'policies', label: 'Policies', icon: FileText },
  { key: 'plans', label: 'Rental Plans', icon: CalendarRange },
];

const NUMERIC_FIELDS = [
  { key: 'gstPercent', label: 'GST (%)', hint: 'Applied to every checkout.' },
  { key: 'platformFeePercent', label: 'Platform fee (%)', hint: 'RentEase commission on rentals.' },
  { key: 'baseDeliveryFee', label: 'Base delivery fee (₹)' },
  { key: 'freeDeliveryThreshold', label: 'Free delivery threshold (₹)' },
  { key: 'lateReturnFeePerDay', label: 'Late return fee / day (₹)' },
  { key: 'cancellationWindowHours', label: 'Cancellation window (hours)' },
  { key: 'refundProcessingDays', label: 'Refund processing (days)' },
];

const POLICY_FIELDS = [
  { key: 'cancellationPolicy', label: 'Cancellation policy' },
  { key: 'refundPolicy', label: 'Refund policy' },
  { key: 'privacyPolicy', label: 'Privacy policy' },
  { key: 'termsOfService', label: 'Terms of service' },
];

const DURATIONS = [1, 3, 6, 12];

function RentalPlanRow({ plan, durationMonths }) {
  const [upsertPlan, { isLoading }] = useAdminUpsertRentalPlanMutation();
  const [form, setForm] = useState({ label: '', discountPercent: 0, isActive: true });

  useEffect(() => {
    if (plan) setForm({ label: plan.label || '', discountPercent: plan.discountPercent ?? 0, isActive: plan.isActive ?? true });
    else setForm({ label: `${durationMonths} Month Plan`, discountPercent: 0, isActive: true });
  }, [plan, durationMonths]);

  const handleSave = async () => {
    try {
      await upsertPlan({ durationMonths, label: form.label, discountPercent: Number(form.discountPercent), isActive: form.isActive }).unwrap();
      toast.success(`${durationMonths}-month plan saved.`);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not save rental plan.');
    }
  };

  return (
    <Card variant="glass" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-sm font-bold text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
        {durationMonths}mo
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <Input label="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
        <Input
          label="Discount (%)"
          type="number"
          min={0}
          max={100}
          value={form.discountPercent}
          onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
        />
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Switch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Active" />
        <Button size="sm" loading={isLoading} onClick={handleSave}>
          <Save size={13} /> Save
        </Button>
      </div>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('general');
  const { data: settingsData, isLoading: settingsLoading } = useAdminGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useAdminUpdateSettingsMutation();
  const { data: plansData, isLoading: plansLoading } = useAdminListRentalPlansQuery();

  const settings = settingsData?.data;
  const plans = plansData?.data || [];

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { gstPercent, platformFeePercent, baseDeliveryFee, freeDeliveryThreshold, lateReturnFeePerDay, cancellationWindowHours, refundProcessingDays, supportEmail, supportPhone, cancellationPolicy, refundPolicy, privacyPolicy, termsOfService } = form;
      await updateSettings({
        gstPercent: Number(gstPercent),
        platformFeePercent: Number(platformFeePercent),
        baseDeliveryFee: Number(baseDeliveryFee),
        freeDeliveryThreshold: Number(freeDeliveryThreshold),
        lateReturnFeePerDay: Number(lateReturnFeePerDay),
        cancellationWindowHours: Number(cancellationWindowHours),
        refundProcessingDays: Number(refundProcessingDays),
        supportEmail,
        supportPhone,
        cancellationPolicy,
        refundPolicy,
        privacyPolicy,
        termsOfService,
      }).unwrap();
      toast.success('Settings updated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update settings.');
    }
  };

  const loading = settingsLoading || !form;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform fees, policies and rental plan configuration.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab !== 'plans' && loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : tab === 'general' ? (
        <Card variant="glass" className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {NUMERIC_FIELDS.map((f) => (
                <Input
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  type="number"
                  min={0}
                  value={form[f.key] ?? ''}
                  onChange={handleField(f.key)}
                />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Support email" type="email" value={form.supportEmail ?? ''} onChange={handleField('supportEmail')} />
              <Input label="Support phone" value={form.supportPhone ?? ''} onChange={handleField('supportPhone')} />
            </div>
            <Button type="submit" loading={isSaving} className="w-fit">
              <Save size={15} /> Save changes
            </Button>
          </form>
        </Card>
      ) : tab === 'policies' ? (
        <Card variant="glass" className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {POLICY_FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.label}</label>
                <textarea
                  rows={4}
                  value={form[f.key] ?? ''}
                  onChange={handleField(f.key)}
                  className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            ))}
            <Button type="submit" loading={isSaving} className="w-fit">
              <Save size={15} /> Save changes
            </Button>
          </form>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarRange size={12} /> Exactly four rental durations exist platform-wide — edit their label, discount and active state below.
          </p>
          {plansLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            DURATIONS.map((d) => (
              <RentalPlanRow key={d} durationMonths={d} plan={plans.find((p) => p.durationMonths === d)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
