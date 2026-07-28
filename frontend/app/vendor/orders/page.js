'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Search, ShoppingBag, ImageOff, Check, X, Sparkles, MapPin, Phone, Receipt, CalendarClock, Calendar, Truck, PackageCheck, Wallet } from 'lucide-react';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { useGetMyVendorProfileQuery, useListMyProductsQuery } from '@/store/vendorApi';
import { useListVendorOrderItemsQuery, useUpdateVendorItemStatusMutation } from '@/store/orderApi';
import { buildVendorOrders, ORDER_STATUSES } from '@/lib/mockVendorData';
import { formatDate, money } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s }))];

const PAYMENT_STATUS_VARIANT = { paid: 'success', pending: 'neutral', failed: 'accent', refunded: 'accent', partially_refunded: 'accent' };

// Pickup/Delivery aren't separate stored fields — they're the same OrderItem.status lifecycle,
// read back out through its real pickedUpAt/deliveredAt timestamps (set the moment a delivery
// partner actually performs each step) rather than inventing new parallel state.
function pickupStatus(item) {
  return item.pickedUpAt ? 'Picked up' : 'Pending pickup';
}
function deliveryStatus(item) {
  if (item.deliveredAt) return 'Delivered';
  if (item.pickedUpAt) return 'Out for delivery';
  return 'Not dispatched';
}

// Real OrderItem.status values are lowercase/snake_case; OrderStatusBadge's palette (and the
// demo-order pipeline it was originally built for) uses Title Case labels — mapping real
// statuses onto those same labels reuses the existing badge as-is instead of forking it.
const REAL_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  active_rental: 'Active Rental',
  extension_requested: 'Extension Requested',
  pickup_scheduled: 'Pickup Scheduled',
  returned: 'Returned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function RealOrderCard({ order }) {
  const [updateStatus, { isLoading }] = useUpdateVendorItemStatusMutation();
  const product = order.product;
  const customer = order.order?.customer;

  const handle = async (action) => {
    try {
      await updateStatus({ itemId: order._id, action }).unwrap();
      toast.success(action === 'confirm' ? 'Order confirmed — now visible to delivery partners.' : 'Order rejected.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update this order.');
    }
  };

  const monthlyAmount = order.monthlyRentalPrice * order.quantity;

  return (
    <Card variant="glass" hover className="p-4 transition-shadow duration-300 hover:shadow-glow">
      <div className="flex flex-wrap items-center gap-4">
        {product?.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
            <ImageOff size={18} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{product?.name}</p>
            <Badge variant="success" className="shrink-0">
              <Sparkles size={10} /> Live
            </Badge>
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {customer?.name} · {customer?.email}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
            <span>{order.order?.orderNumber}</span>
            {order.order?.deliveryAddress?.city && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {order.order.deliveryAddress.city}
              </span>
            )}
            {customer?.phone && (
              <span className="flex items-center gap-1">
                <Phone size={11} /> {customer.phone}
              </span>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">₹{monthlyAmount.toLocaleString('en-IN')}/mo</p>
          <p className="text-xs text-slate-400">{order.rentalPlan?.label} · qty {order.quantity}</p>
        </div>

        <OrderStatusBadge status={REAL_STATUS_LABELS[order.status] || order.status} />

        {order.status === 'pending' && (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Button size="sm" loading={isLoading} onClick={() => handle('confirm')}>
              <Check size={14} /> Confirm
            </Button>
            <Button size="sm" variant="ghost" loading={isLoading} onClick={() => handle('reject')}>
              <X size={14} /> Reject
            </Button>
          </div>
        )}
      </div>

      {/* Full order detail row — order id, invoice, rental window, payment/pickup/delivery
          status, and security deposit, all sourced from the real Order/OrderItem documents. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-200/70 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Receipt size={11} /> {order.order?.invoiceNumber || '—'}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} /> Ordered {formatDate(order.order?.placedAt || order.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock size={11} />
          {order.rentalStartDate ? `${formatDate(order.rentalStartDate)} – ${order.rentalEndDate ? formatDate(order.rentalEndDate) : 'ongoing'}` : 'Rental not started'}
        </span>
        <span className="flex items-center gap-1">
          <Wallet size={11} /> Deposit {money(order.securityDeposit)}
        </span>
        <Badge variant={PAYMENT_STATUS_VARIANT[order.order?.paymentStatus] || 'neutral'} className="capitalize">
          Payment {order.order?.paymentStatus || 'pending'}
        </Badge>
        <Badge variant={order.pickedUpAt ? 'success' : 'neutral'}>
          <PackageCheck size={10} /> {pickupStatus(order)}
        </Badge>
        <Badge variant={order.deliveredAt ? 'success' : 'neutral'}>
          <Truck size={10} /> {deliveryStatus(order)}
        </Badge>
      </div>
    </Card>
  );
}

export default function VendorOrdersPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: profileData } = useGetMyVendorProfileQuery();
  const vendorId = profileData?.data?._id;
  const { data: productsData, isLoading } = useListMyProductsQuery(
    { vendor: vendorId, city: selectedCity?.id, sort: 'newest', limit: 48 },
    { skip: !vendorId }
  );
  const { data: realOrdersData, isLoading: realOrdersLoading } = useListVendorOrderItemsQuery(
    { city: selectedCity?.id },
    { pollingInterval: LIVE_POLL_MS }
  );

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const products = productsData?.data?.items || [];
  const realOrders = realOrdersData?.data || [];
  const allOrders = useMemo(() => buildVendorOrders(products, 32), [products]);

  const filteredReal = useMemo(() => {
    const q = search.trim().toLowerCase();
    return realOrders.filter((o) => {
      const matchesSearch =
        !q ||
        o.order?.customer?.name?.toLowerCase().includes(q) ||
        o.product?.name?.toLowerCase().includes(q) ||
        o.order?.orderNumber?.toLowerCase().includes(q);
      const matchesStatus = !status || REAL_STATUS_LABELS[o.status] === status;
      return matchesSearch && matchesStatus;
    });
  }, [realOrders, search, status]);

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allOrders.filter((o) => {
      const matchesSearch = !q || o.customerName.toLowerCase().includes(q) || o.product.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
      const matchesStatus = !status || o.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [allOrders, search, status]);

  const totalCount = allOrders.length + realOrders.length;
  const loading = isLoading || realOrdersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Customer orders</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {totalCount} orders placed against your products{realOrders.length > 0 && ` — ${realOrders.length} placed through real checkout`}.
        </p>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search customer, product or order #…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-48" />
      </Card>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filteredReal.length === 0 && orders.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <ShoppingBag size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No orders match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredReal.map((order) => (
            <RealOrderCard key={order._id} order={order} />
          ))}

          {orders.map((order) => (
            <Card key={order.id} variant="glass" className="flex flex-wrap items-center gap-4 p-4">
              {order.product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.product.images[0]} alt={order.product.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                  <ImageOff size={18} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{order.product.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {order.customerName} · {order.customerEmail}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {order.id} · {new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  ₹{order.monthlyAmount.toLocaleString('en-IN')}/mo
                </p>
                <p className="text-xs text-slate-400">{order.durationMonths} month plan</p>
              </div>

              <OrderStatusBadge status={order.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
