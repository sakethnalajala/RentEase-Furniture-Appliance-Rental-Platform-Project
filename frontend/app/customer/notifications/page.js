'use client';

import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Package, Wrench, Tag, CreditCard, Truck, KeyRound, Hash } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Skeleton from '@/components/ui/Skeleton';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import {
  useListNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '@/store/notificationApi';

const TYPE_ICON = { order: Package, rental: Bell, maintenance: Wrench, promotion: Tag, payment: CreditCard, delivery: Truck, system: Bell };
const TYPE_COLOR = {
  order: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  rental: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  promotion: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  payment: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  delivery: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  system: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

function timeAgo(date) {
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// The backend writes structured fields (Order ID, Delivery OTP, ...) into `message` as
// readable "Label: value" lines too (so the raw text is meaningful even if this component
// never renders), but pulls them back out here to render as distinct, scannable fields/pills —
// an Order ID chip, a copyable OTP pill, an estimated-delivery chip — instead of leaving them
// buried mid-paragraph. Falls back to plain text if a notification carries none of this meta
// (e.g. a plain system/promotion notice).
function MessageBody({ notification }) {
  const { orderNumber, deliveryOtp, estimatedDeliveryDays } = notification.meta || {};
  if (!orderNumber && !deliveryOtp) {
    return <p className="mt-0.5 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{notification.message}</p>;
  }

  const lines = notification.message
    .split('\n')
    .filter((line) => !line.includes('Delivery OTP') && !line.startsWith('Order ID'));

  return (
    <div className="mt-1 space-y-2">
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-slate-500 dark:text-slate-400">
          {line}
        </p>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {orderNumber && (
          <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <Hash size={12} /> {orderNumber}
          </span>
        )}
        {deliveryOtp && (
          <>
            <span className="flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <KeyRound size={12} /> Delivery OTP
            </span>
            <span className="rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold tracking-widest text-slate-900 shadow-sm dark:bg-slate-900/80 dark:text-white">
              {deliveryOtp}
            </span>
          </>
        )}
        {estimatedDeliveryDays && (
          <span className="text-xs text-slate-400">
            Est. delivery: {estimatedDeliveryDays} day{estimatedDeliveryDays === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data, isLoading } = useListNotificationsQuery();
  const { data: unreadData } = useGetUnreadNotificationCountQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const { prefs, toggle } = useNotificationPrefs();

  const list = data?.data || [];
  const unreadCount = unreadData?.data?.count ?? list.filter((n) => !n.isRead).length;

  const handleMarkAll = async () => {
    await markAllRead();
    toast.success('All notifications marked as read.');
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    toast.success('Notification deleted.');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
          </div>
          <Button variant="ghost" size="sm" loading={isMarkingAll} onClick={handleMarkAll} disabled={unreadCount === 0}>
            <CheckCheck size={15} /> Mark all read
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-12 text-center">
            <Bell size={28} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">You&apos;re all caught up.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {list.map((n) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                return (
                  <motion.div
                    key={n._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  >
                    <Card
                      variant="glass"
                      hover
                      onClick={() => !n.isRead && markRead(n._id)}
                      className={`flex cursor-pointer items-start gap-3 p-4 transition-shadow duration-300 hover:shadow-glow ${!n.isRead ? 'ring-1 ring-brand-500/30' : ''}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                          {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                        </div>
                        <MessageBody notification={n} />
                        <p className="mt-1.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n._id);
                        }}
                        aria-label="Delete notification"
                        className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Card variant="glass" className="h-fit space-y-1 p-5">
        <h2 className="mb-2 font-display text-lg font-semibold text-slate-900 dark:text-white">Preferences</h2>

        <Switch checked={prefs.push} onChange={() => toggle('push')} label="Push notifications" description="On this device" />
        <Switch checked={prefs.email} onChange={() => toggle('email')} label="Email notifications" />
        <Switch checked={prefs.sms} onChange={() => toggle('sms')} label="SMS notifications" />
        <Switch checked={prefs.whatsapp} onChange={() => toggle('whatsapp')} label="WhatsApp notifications" />
        <Switch checked={prefs.sound} onChange={() => toggle('sound')} label="Notification sound" />

        <div className="my-3 h-px bg-slate-200/70 dark:bg-white/10" />

        <Switch checked={prefs.orderUpdates} onChange={() => toggle('orderUpdates')} label="Order updates" />
        <Switch checked={prefs.rentalReminders} onChange={() => toggle('rentalReminders')} label="Rental reminders" />
        <Switch checked={prefs.maintenanceUpdates} onChange={() => toggle('maintenanceUpdates')} label="Maintenance updates" />
        <Switch checked={prefs.promotionalOffers} onChange={() => toggle('promotionalOffers')} label="Promotional offers" />
      </Card>
    </div>
  );
}
