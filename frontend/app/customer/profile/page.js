'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { User, Mail, Phone, ShieldCheck, BadgeCheck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useGetMeQuery, useUpdateProfileMutation } from '@/store/authApi';

export default function ProfilePage() {
  const authUser = useSelector((state) => state.auth.user);
  const { data, isLoading } = useGetMeQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [form, setForm] = useState({ name: '', phone: '' });

  const profile = data?.data || authUser;

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' });
  }, [profile?.name, profile?.phone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(form).unwrap();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update profile.');
    }
  };

  if (isLoading && !profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account details.</p>
      </div>

      <Card variant="glass" className="flex items-center gap-4 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-bold text-white shadow-premium">
          {profile?.name?.[0]?.toUpperCase() || <User size={24} />}
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile?.name}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant="brand">Customer</Badge>
            {profile?.isEmailVerified && (
              <Badge variant="success">
                <BadgeCheck size={12} /> Email verified
              </Badge>
            )}
            {profile?.twoFactorEnabled && (
              <Badge variant="neutral">
                <ShieldCheck size={12} /> 2FA on
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <div className="focus-ring flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <Mail size={15} /> {profile?.email}
            </div>
          </div>
          <Button type="submit" loading={isSaving} className="w-fit">
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
