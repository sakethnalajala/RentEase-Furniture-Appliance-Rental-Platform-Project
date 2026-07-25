'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Truck, Bike, Car, Star, Phone, Mail, MapPin, Users, ArrowUpRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useListVendorDeliveryPartnersQuery } from '@/store/vendorApi';
import { initials } from '@/lib/deliveryHelpers';

const VEHICLE_ICONS = { bike: Bike, van: Car, truck: Truck };

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

function DeliveryPartnerCard({ partner }) {
  const avatarSrc = partner.user?.avatar || partner.profilePhoto;
  const VehicleIcon = VEHICLE_ICONS[partner.vehicleType] || Truck;

  return (
    <Card variant="glass" hover className="overflow-hidden p-0 transition-shadow duration-300 hover:shadow-glow">
      <Link href={`/vendor/delivery-partners/${partner._id}`} className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={partner.user?.name}
              className="h-14 w-14 shrink-0 rounded-full object-cover shadow-premium"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white shadow-premium">
              {initials(partner.user?.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{partner.user?.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <OnlinePill isOnline={partner.isOnline} />
              <AvailabilityPill isAvailable={partner.isAvailable} />
            </div>
          </div>

          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {partner.averageRating ? partner.averageRating.toFixed(1) : '—'}
          </span>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-1.5">
            <Phone size={12} className="shrink-0" /> {partner.user?.phone || '—'}
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <Mail size={12} className="shrink-0" /> <span className="truncate">{partner.user?.email}</span>
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <MapPin size={12} className="shrink-0" />
            {partner.assignedCity?.name}
            {partner.assignedCity?.state ? `, ${partner.assignedCity.state}` : ''}
            {partner.area ? ` · ${partner.area}` : ''}
          </p>
          <p className="flex items-center gap-1.5 capitalize">
            <VehicleIcon size={12} className="shrink-0" /> {partner.vehicleType} · {partner.vehicleNumber}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-200/70 pt-3 mt-4 dark:border-white/10">
          <span className="text-xs text-slate-400">{partner.totalDeliveries || 0} deliveries</span>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
            View profile <ArrowUpRight size={12} />
          </span>
        </div>
      </Link>
    </Card>
  );
}

export default function VendorDeliveryPartnersPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data, isLoading } = useListVendorDeliveryPartnersQuery({ city: selectedCity?.id });
  const partners = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Delivery partners</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {partners.length > 0 ? `${partners.length} partners in your fleet` : 'Partners who deliver your orders'}
          {selectedCity ? ` in ${selectedCity.name}.` : ' — select a city to narrow this list.'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <Users size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No delivery partners to show yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <DeliveryPartnerCard key={partner._id} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
}
