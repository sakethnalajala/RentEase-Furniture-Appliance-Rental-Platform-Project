'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Sun, Moon, Gem, Waves, Lock, Trash2, ShieldAlert, Bell } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { useChangePasswordMutation, useDeactivateAccountMutation } from '@/store/authApi';

const THEMES = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'glass', label: 'Glass', icon: Gem },
  { key: 'midnight', label: 'Midnight Blue', icon: Waves },
];

function SettingsSection({ title, children }) {
  return (
    <Card variant="glass" className="p-5">
      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default function VendorSettingsPage() {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { prefs, toggle } = useNotificationPrefs();
  const [autoAcceptOrders, setAutoAcceptOrders] = useLocalStorage('rentease_vendor_auto_accept', false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [deactivateAccount, { isLoading: isDeactivating }] = useDeactivateAccountMutation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const currentTheme = THEMES.some((t) => t.key === theme) ? theme : resolvedTheme === 'dark' ? 'dark' : 'light';

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();
      toast.success('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err?.data?.message || 'Could not change password.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deactivateAccount().unwrap();
      toast.success('Account deactivated.');
      router.replace('/');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not deactivate account.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your vendor account and preferences.</p>
      </div>

      <SettingsSection title="Theme">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTheme(t.key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                currentTheme === t.key
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400/60 dark:bg-brand-400/10 dark:text-brand-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Order & notification preferences">
        <Switch
          checked={autoAcceptOrders}
          onChange={setAutoAcceptOrders}
          label="Auto-accept rental requests"
          description="Skip manual approval for requests under 3 months"
        />
        <div className="my-3 h-px bg-slate-200/70 dark:bg-white/10" />
        <Switch checked={prefs.push} onChange={() => toggle('push')} label="Push notifications" />
        <Switch checked={prefs.email} onChange={() => toggle('email')} label="Email notifications" />
        <Switch checked={prefs.sms} onChange={() => toggle('sms')} label="SMS notifications" />
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Bell size={12} /> Live notifications are on the Notification Center page.
        </p>
      </SettingsSection>

      <SettingsSection title="Change password">
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Input
            label="Current password"
            type="password"
            required
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            required
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            hint="At least 8 characters, one uppercase letter, one number."
          />
          <Input
            label="Confirm new password"
            type="password"
            required
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          />
          <Button type="submit" loading={isChangingPassword} className="w-fit">
            <Lock size={15} /> Update password
          </Button>
        </form>
      </SettingsSection>

      <Card variant="glass" className="border border-rose-500/20 p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-rose-600 dark:text-rose-400">
          <ShieldAlert size={18} /> Danger zone
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Deactivating your vendor account signs you out everywhere and hides your listings from customers.
        </p>
        <Button variant="danger" className="mt-3" onClick={() => setDeleteModalOpen(true)}>
          <Trash2 size={15} /> Deactivate account
        </Button>
      </Card>

      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Deactivate your vendor account?">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This signs you out of RentEase everywhere and prevents future logins until support re-activates it. Your
          product catalog will be preserved.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" loading={isDeactivating} onClick={handleDeleteAccount} className="flex-1">
            Yes, deactivate
          </Button>
        </div>
      </Modal>
    </div>
  );
}
