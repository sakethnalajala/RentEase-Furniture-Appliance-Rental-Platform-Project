'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Truck, Bike, Car, Star, Phone, Mail, MapPin, ArrowLeft, Package, CheckCircle2, XCircle,
  Hourglass, Wallet, TrendingUp, Quote, ImageOff, CalendarClock, PackageSearch,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { useListVendorDeliveryPartnersQuery } from '@/store/vendorApi';
import { CountUpNumber } from '@/components/vendor/AnalyticsCharts';
import { initials, statusLabel, formatDate } from '@/lib/deliveryHelpers';

const VEHICLE_ICONS = { bike: Bike, van: Car, truck: Truck };

function StatTile({ icon: Icon, label, value, prefix = '', suffix = '', decimals = 0, accent, fallback }) {
  return (
    <Card variant="glass" className="p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={16} />
      </div>
      <p className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
        {fallback !== undefined ? (
          fallback
        ) : (
          <CountUpNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        )}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

function StarRow({ rating, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/20'}
        />
      ))}
    </div>
  );
}

function OnlinePill({ isOnline }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isOnline
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

function AvailabilityPill({ isAvailable }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isAvailable
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-brand-500' : 'bg-amber-500'}`} />
      {isAvailable ? 'Available' : 'Busy'}
    </span>
  );
}

export default function VendorDeliveryPartnerDetailPage() {
  const { id } = useParams();
  // Reuses the already-fetched fleet list (same RTK Query cache key as the list page) —
  // no separate by-id endpoint exists, so we find-by-id client-side rather than add a fetch.
  const { data, isLoading } = useListVendorDeliveryPartnersQuery();
  const partners = data?.data || [];
  const partner = partners.find((p) => p._id === id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (!partner) {
    return (
      <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
        <Truck size={32} className="text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">This delivery partner isn&apos;t available anymore.</p>
        <Link
          href="/vendor/delivery-partners"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          <ArrowLeft size={14} /> Back to Delivery Partners
        </Link>
      </Card>
    );
  }

  const perf = partner.performance || {};
  const avatarSrc = partner.user?.avatar || partner.profilePhoto;
  const VehicleIcon = VEHICLE_ICONS[partner.vehicleType] || Truck;
  const reviews = perf.reviews || [];
  const orders = perf.orders || [];

  return (
    <div className="space-y-6">
      <Link
        href="/vendor/delivery-partners"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowLeft size={15} /> Back to Delivery Partners
      </Link>

      {/* Profile header */}
      <Card variant="glass" className="flex flex-wrap items-center gap-5 p-6">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt={partner.user?.name} className="h-20 w-20 shrink-0 rounded-full object-cover shadow-premium" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-premium">
            {initials(partner.user?.name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{partner.user?.name}</h1>
            <OnlinePill isOnline={partner.isOnline} />
            <AvailabilityPill isAvailable={partner.isAvailable} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Phone size={13} /> {partner.user?.phone || '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail size={13} /> {partner.user?.email}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {partner.assignedCity?.name}
              {partner.assignedCity?.state ? `, ${partner.assignedCity.state}` : ''}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <VehicleIcon size={13} /> {partner.vehicleType} · {partner.vehicleNumber}
            </span>
          </div>
          {partner.joinedAt && <p className="mt-1.5 text-xs text-slate-400">Partner since {formatDate(partner.joinedAt)}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StarRow rating={partner.averageRating} size={18} />
          <p className="text-xs text-slate-400">{partner.totalDeliveries || 0} total deliveries (platform-wide)</p>
        </div>
      </Card>

      {/* Performance */}
      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">
          Performance <span className="font-normal text-slate-400">— for your orders</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={Package} label="Products delivered" value={perf.productsDelivered || 0} accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
          <StatTile icon={TrendingUp} label="Success rate" value={perf.successRate || 0} suffix="%" accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
          <StatTile
            icon={Star}
            label="Customer rating"
            value={perf.customerRating || 0}
            decimals={1}
            fallback={perf.customerRating ? undefined : <span className="text-base font-medium text-slate-400">No ratings yet</span>}
            accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatTile icon={Wallet} label="Total earnings" value={perf.totalEarnings || 0} prefix="₹" accent="bg-accent-500/10 text-accent-600 dark:text-accent-300" />
          <StatTile icon={CheckCircle2} label="Accepted requests" value={perf.acceptedRequests || 0} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
          <StatTile icon={XCircle} label="Rejected requests" value={perf.rejectedRequests || 0} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
          <StatTile icon={Hourglass} label="Pending deliveries" value={perf.pendingDeliveries || 0} accent="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
          <StatTile icon={Truck} label="Active deliveries" value={perf.activeDeliveries || 0} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Customer reviews</h2>
        {reviews.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <Quote size={26} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No customer reviews for this partner yet.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reviews.map((r) => (
              <Card key={r.orderItemId} variant="glass" className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <StarRow rating={r.rating} />
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(r.date)}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">&ldquo;{r.comment}&rdquo;</p>}
                <p className="mt-2 truncate text-xs text-slate-400">
                  {r.customerName} · {r.productName}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent deliveries */}
      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900 dark:text-white">Recent deliveries</h2>
        {orders.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-2 p-10 text-center">
            <PackageSearch size={26} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No deliveries recorded for this partner yet.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {orders.map((o) => (
              <Card key={o.orderItemId} variant="glass" className="flex flex-wrap items-center gap-4 p-4">
                {o.productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.productImage} alt={o.productName} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={16} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{o.productName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {o.customerName} · {o.orderNumber}
                  </p>
                  {o.deliveryDate && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <CalendarClock size={11} /> {formatDate(o.deliveryDate)}
                      {o.deliveryTime ? ` · ${o.deliveryTime}` : ''}
                    </p>
                  )}
                  {o.review && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">&ldquo;{o.review}&rdquo;</p>}
                </div>

                {o.rating ? <StarRow rating={o.rating} size={13} /> : <span className="shrink-0 text-xs text-slate-400">Not rated</span>}

                <OrderStatusBadge status={statusLabel(o.status)} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
