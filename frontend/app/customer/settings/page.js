'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Sun, Moon, Gem, Waves, Lock, Globe, MapPin, Trash2, ShieldAlert } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import {
  useChangePasswordMutation,
  useDeactivateAccountMutation,
  useSelectCityMutation,
  useListCitiesQuery,
} from '@/store/authApi';

const THEMES = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'glass', label: 'Glass', icon: Gem },
  { key: 'midnight', label: 'Midnight Blue', icon: Waves },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
];

function SettingsSection({ title, children }) {
  return (
    <Card variant="glass" className="p-5">
      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { prefs, toggle } = useNotificationPrefs();
  const [language, setLanguage] = useLocalStorage('rentease_language', 'en');
  const [profileVisible, setProfileVisible] = useLocalStorage('rentease_privacy_profile_visible', true);
  const [shareRentalActivity, setShareRentalActivity] = useLocalStorage('rentease_privacy_share_activity', false);

  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: citiesData } = useListCitiesQuery();
  const [selectCity, { isLoading: isSavingCity }] = useSelectCityMutation();

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [deactivateAccount, { isLoading: isDeactivating }] = useDeactivateAccountMutation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const currentTheme = THEMES.some((t) => t.key === theme) ? theme : resolvedTheme === 'dark' ? 'dark' : 'light';
  const cities = citiesData?.data || [];

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

  const handleCityChange = async (e) => {
    const city = cities.find((c) => c._id === e.target.value);
    if (!city) return;
    try {
      await selectCity({ cityId: city._id }).unwrap();
      toast.success(`City preference updated to ${city.name}.`);
    } catch {
      toast.error('Could not update city preference.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deactivateAccount().unwrap();
      toast.success('Account deactivated. Sorry to see you go.');
      router.replace('/');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not deactivate account.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account, preferences, and security.</p>
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

      <SettingsSection title="Notification preferences">
        <Switch checked={prefs.push} onChange={() => toggle('push')} label="Push notifications" />
        <Switch checked={prefs.email} onChange={() => toggle('email')} label="Email notifications" />
        <Switch checked={prefs.sms} onChange={() => toggle('sms')} label="SMS notifications" />
        <Switch checked={prefs.whatsapp} onChange={() => toggle('whatsapp')} label="WhatsApp notifications" />
        <p className="mt-2 text-xs text-slate-400">Fine-grained controls live on the Notifications page.</p>
      </SettingsSection>

      <SettingsSection title="Privacy">
        <Switch
          checked={profileVisible}
          onChange={setProfileVisible}
          label="Show my profile to vendors"
          description="Vendors fulfilling your rentals can see your name and contact info"
        />
        <Switch
          checked={shareRentalActivity}
          onChange={setShareRentalActivity}
          label="Share rental activity for recommendations"
          description="Helps us recommend more relevant products"
        />
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

      <SettingsSection title="Language">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                toast.success(`Language preference saved: ${l.label}`);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                language === l.code
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400/60 dark:bg-brand-400/10 dark:text-brand-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
            >
              <Globe size={13} /> {l.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Your preference is saved — full translated content for non-English languages is on the roadmap.
        </p>
      </SettingsSection>

      <SettingsSection title="City preference">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-brand-500" />
          <select
            value={selectedCity?.id || ''}
            onChange={handleCityChange}
            disabled={isSavingCity}
            className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="" disabled>
              Select a city
            </option>
            {cities.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </SettingsSection>

      <Card variant="glass" className="border border-rose-500/20 p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-rose-600 dark:text-rose-400">
          <ShieldAlert size={18} /> Danger zone
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Deactivating your account signs you out everywhere and disables login. This can be reversed by contacting
          support.
        </p>
        <Button variant="danger" className="mt-3" onClick={() => setDeleteModalOpen(true)}>
          <Trash2 size={15} /> Deactivate account
        </Button>
      </Card>

      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Deactivate your account?">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This will sign you out of RentEase everywhere and prevent future logins until support re-activates it. Your
          wishlist, cart, and saved addresses will be preserved.
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
