'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Truck, Wrench, ImageOff, QrCode, Barcode as BarcodeIcon, Ruler, Weight, Calendar,
  Palette, Boxes, MapPin, Warehouse,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useGetVendorProductQuery } from '@/store/vendorApi';

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="font-medium capitalize text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-1.5">
      {Icon && <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />}
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="font-medium text-slate-700 dark:text-slate-200">{value}</dd>
      </div>
    </div>
  );
}

export default function VendorProductDetailPage() {
  const { productId } = useParams();
  const { data, isLoading, error } = useGetVendorProductQuery(productId);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data?.data?.product) {
    return (
      <Card variant="glass" className="p-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">This product isn’t available anymore.</p>
        <Link href="/vendor/products" className="mt-4 inline-block text-sm font-medium text-brand-600 dark:text-brand-400">
          Back to Products
        </Link>
      </Card>
    );
  }

  const { product, inventory } = data.data;
  const lowStock = product.stock <= 2;

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            {product.images?.[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                <ImageOff size={32} />
              </div>
            )}
            {product.discountPercent > 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                {product.discountPercent}% OFF
              </span>
            )}
          </div>

          {product.images?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                    activeImage === i ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{product.subCategory}</Badge>
            <Badge variant={lowStock ? 'neutral' : 'success'} className={lowStock ? '!bg-amber-500/15 !text-amber-700 dark:!text-amber-300' : ''}>
              <Boxes size={11} /> {product.stock} in stock
            </Badge>
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>{product.brand}</span>
            <span className="flex items-center gap-1 text-amber-500">
              <Star size={14} className="fill-amber-400 text-amber-400" /> {product.averageRating?.toFixed(1)}{' '}
              <span className="text-slate-400">({product.numReviews} reviews)</span>
            </span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white">
              ₹{product.monthlyRentalPrice?.toLocaleString('en-IN')}
              <span className="text-base font-normal text-slate-500 dark:text-slate-400">/mo</span>
            </p>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ₹{product.securityDeposit?.toLocaleString('en-IN')} refundable security deposit charged to customer
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-200/70 pt-6 text-sm dark:border-white/10 sm:grid-cols-4">
            <InfoItem icon={Truck} label="Delivery" value={`${product.estimatedDeliveryDays} day(s)`} />
            <InfoItem icon={Wrench} label="Installation" value={product.installationRequired ? 'Required' : 'Not needed'} />
            <InfoItem icon={MapPin} label="City" value={product.city?.name} />
            <InfoItem icon={Warehouse} label="Condition" value={product.condition?.replace('_', ' ')} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="glass" className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Description</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Specifications
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <DetailRow icon={Palette} label="Color" value={product.color} />
            <DetailRow
              icon={Ruler}
              label="Dimensions"
              value={product.dimensions?.length ? `${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height} ${product.dimensions.unit}` : '—'}
            />
            <DetailRow icon={Weight} label="Weight" value={product.weight?.value ? `${product.weight.value} ${product.weight.unit}` : '—'} />
            <DetailRow icon={Calendar} label="Purchase year" value={product.purchaseYear} />
            <DetailRow label="Min. rental" value={`${product.minRentalPeriodMonths} mo`} />
            <DetailRow label="Max. rental" value={`${product.maxRentalPeriodMonths} mo`} />
            <DetailRow label="Delivery charge" value={product.deliveryCharge > 0 ? `₹${product.deliveryCharge}` : 'Free'} />
            <DetailRow label="SKU" value={product.sku} />
          </dl>
        </Card>

        <Card variant="glass" className="p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Unit details</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The serialized inventory unit backing this listing.</p>
          {inventory ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{inventory.serialNumber}</p>
              <Badge variant="neutral" className="capitalize">{inventory.status?.replace('_', ' ')}</Badge>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inventory.qrCodeUrl} alt="QR code" className="mx-auto h-20 w-20" />
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                    <QrCode size={11} /> QR Code
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inventory.barcodeUrl} alt="Barcode" className="mx-auto h-20 w-full object-contain" />
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                    <BarcodeIcon size={11} /> Barcode
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No inventory unit on file.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
