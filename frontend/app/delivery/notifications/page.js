'use client';

import { toast } from 'sonner';
import { Bell, CheckCheck, Trash2, Package, Truck, CreditCard, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import {
  useListNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '@/store/notificationApi';
import { statusLabel, timeAgo } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

// This is the exact same real, generic Notification model/API every other role uses (see
// frontend/store/notificationApi.js) — no delivery-specific backend work needed. Real
// accept/pickup/deliver actions (backend/src/controllers/delivery.controller.js) already
// create real Notification docs targeted at this user, so this page shows genuine activity.
const TYPE_ICON = { order: Package, delivery: Truck, payment: CreditCard, system: Info, maintenance: Package, promotion: Info };
const TYPE_COLOR = {
  order: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  delivery: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  payment: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  system: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  promotion: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
};

export default function DeliveryNotificationsPage() {
  const { data, isLoading } = useListNotificationsQuery(undefined, { pollingInterval: LIVE_POLL_MS });
  const { data: unreadData } = useGetUnreadNotificationCountQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Notification center</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
        </div>
        <Button variant="ghost" size="sm" loading={isMarkingAll} onClick={handleMarkAll} disabled={unreadCount === 0}>
          <CheckCheck size={15} /> Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-2 p-12 text-center">
          <Bell size={28} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You&apos;re all caught up — new delivery requests and order updates will show up here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            return (
              <Card
                key={n._id}
                variant="glass"
                onClick={() => !n.isRead && markRead(n._id)}
                className={`flex cursor-pointer items-start gap-3 p-4 ${!n.isRead ? 'ring-1 ring-brand-500/30' : ''}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                    {n.meta?.status && <OrderStatusBadge status={statusLabel(n.meta.status)} />}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.message}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    {n.meta?.customerName && <span>Customer: {n.meta.customerName}</span>}
                    {n.meta?.orderNumber && <span>Order: {n.meta.orderNumber}</span>}
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
