'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, Send, Users, User, Building2, Truck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useAdminBroadcastNotificationMutation } from '@/store/adminApi';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users', icon: Users },
  { value: 'customer', label: 'Customers', icon: User },
  { value: 'vendor', label: 'Vendors', icon: Building2 },
  { value: 'delivery_partner', label: 'Delivery partners', icon: Truck },
];

export default function AdminNotificationsPage() {
  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [broadcast, { isLoading }] = useAdminBroadcastNotificationMutation();

  const audienceLabel = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label || 'All users';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are both required.');
      return;
    }
    try {
      const res = await broadcast({ audience, title, message }).unwrap();
      const count = res?.data?.recipientCount ?? 0;
      toast.success(`Broadcast sent to ${count} recipient${count === 1 ? '' : 's'}.`);
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not send broadcast.');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Broadcast Notifications</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send a platform-wide announcement to a chosen audience — delivered as an in-app notification.
        </p>
      </div>

      <Card variant="glass" className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Audience</label>
            <Select
              value={audience}
              onChange={setAudience}
              options={AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>

          <Input
            label="Title"
            placeholder="e.g. Scheduled maintenance tonight"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Message</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the announcement body…"
              className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-500/5 px-4 py-3 text-xs text-slate-500 dark:bg-brand-400/5 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Bell size={13} /> Will be sent to: <strong className="text-slate-700 dark:text-slate-200">{audienceLabel}</strong>
            </span>
          </div>

          <Button type="submit" loading={isLoading} className="w-fit">
            <Send size={15} /> Send broadcast
          </Button>
        </form>
      </Card>
    </div>
  );
}
