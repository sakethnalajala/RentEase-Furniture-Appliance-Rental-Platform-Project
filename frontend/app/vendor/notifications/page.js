'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bell, CheckCheck, Trash2, Package, Wrench, CreditCard, Info, Truck, MapPin,
  Phone, Mail, CalendarClock, UserRound, ArrowUpRight, Receipt,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { LIVE_POLL_MS } from '@/lib/livePoll';
import { formatDateTime, initials } from '@/lib/deliveryHelpers';
import {
  useListNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '@/store/notificationApi';

const TYPE_ICON = { order: Package, maintenance: Wrench, payment: CreditCard, system: Info, delivery: Package, promotion: Info };
const TYPE_COLOR = {
  order: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  payment: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  system: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  delivery: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  promotion: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
};

function timeAgo(date) {
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// The full "Delivery Completed Successfully" breakdown — only rendered for the one notification
// type carrying `meta.deliveryPartnerId` (set exclusively by markDelivered's vendor
// notification), so every other notification type keeps its plain summary line untouched.
function DeliveryCompletedDetails({ meta }) {
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        {meta.deliveryPartnerPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.deliveryPartnerPhoto} alt={meta.deliveryPartnerName} className="h-11 w-11 shrink-0 rounded-full object-cover shadow-premium" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium">
            {initials(meta.deliveryPartnerName)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{meta.deliveryPartnerName}</p>
          <p className="truncate text-[11px] text-slate-400">Partner ID: {meta.deliveryPartnerId}</p>
        </div>
        {meta.totalDeliveriesForVendor !== undefined && (
          <span className="shrink-0 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
            {meta.totalDeliveriesForVendor} deliveries for you
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        {meta.deliveryPartnerPhone && (
          <span className="flex items-center gap-1.5">
            <Phone size={12} className="text-brand-500" /> {meta.deliveryPartnerPhone}
          </span>
        )}
        {meta.deliveryPartnerEmail && (
          <span className="flex items-center gap-1.5 truncate">
            <Mail size={12} className="shrink-0 text-brand-500" /> <span className="truncate">{meta.deliveryPartnerEmail}</span>
          </span>
        )}
        {meta.vehicleType && (
          <span className="flex items-center gap-1.5 capitalize">
            <Truck size={12} className="text-brand-500" /> {meta.vehicleType} · {meta.vehicleNumber}
          </span>
        )}
        {meta.assignedCity && (
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-brand-500" /> Assigned city: {meta.assignedCity}
          </span>
        )}
        {meta.productName && (
          <span className="flex items-center gap-1.5 truncate">
            <Package size={12} className="shrink-0 text-brand-500" /> <span className="truncate">{meta.productName}</span>
          </span>
        )}
        {meta.orderNumber && (
          <span className="flex items-center gap-1.5">
            <Receipt size={12} className="text-brand-500" /> Order {meta.orderNumber}
          </span>
        )}
        {meta.customerName && (
          <span className="flex items-center gap-1.5">
            <UserRound size={12} className="text-brand-500" /> {meta.customerName}
            {meta.customerCity ? ` · ${meta.customerCity}` : ''}
          </span>
        )}
        {meta.deliveredAt && (
          <span className="flex items-center gap-1.5">
            <CalendarClock size={12} className="text-brand-500" /> {formatDateTime(meta.deliveredAt)}
          </span>
        )}
      </div>

      {meta.deliveryPartnerId && (
        <Link
          href={`/vendor/delivery-partners/${meta.deliveryPartnerId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          View partner profile <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}

export default function VendorNotificationsPage() {
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
          <p className="text-sm text-slate-500 dark:text-slate-400">You&apos;re all caught up.</p>
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
                    {n.meta?.status && <OrderStatusBadge status={n.meta.status} />}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.message}</p>

                  {n.meta?.deliveryPartnerId ? (
                    <>
                      <DeliveryCompletedDetails meta={n.meta} />
                      <p className="mt-1.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                    </>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      {n.meta?.customerName && <span>Customer: {n.meta.customerName}</span>}
                      {n.meta?.deliveryPartnerName && (
                        <span className="flex items-center gap-1">
                          <Truck size={11} /> {n.meta.deliveryPartnerName}
                          {n.meta.vehicleNumber ? ` · ${n.meta.vehicleNumber}` : ''}
                        </span>
                      )}
                      {n.meta?.orderNumber && <span>Order: {n.meta.orderNumber}</span>}
                      <span>{timeAgo(n.createdAt)}</span>
                      {n.type === 'delivery' && n.meta?.orderNumber && (
                        <Link
                          href="/vendor/orders"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          <MapPin size={11} /> Track Delivery
                        </Link>
                      )}
                    </div>
                  )}
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
