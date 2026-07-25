'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Star, Boxes, MapPin } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressiveImage from '@/components/ui/ProgressiveImage';

function VendorProductCard({ product }) {
  const image = product.images?.[0];
  const lowStock = product.stock <= 2;

  return (
    <Card variant="glass" tilt className="group flex h-full flex-col overflow-hidden p-0 transition-shadow duration-300 hover:shadow-glow">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProgressiveImage
          src={image}
          alt={product.name}
          className="h-full w-full"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />

        {product.discountPercent > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white">
            {product.discountPercent}% OFF
          </span>
        )}

        <span
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white ${
            lowStock ? 'bg-amber-500/90' : 'bg-slate-900/70'
          }`}
        >
          <Boxes size={11} /> {product.stock} in stock
        </span>
      </div>

      <Link href={`/vendor/products/${product._id}`} className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="neutral" className="truncate">
            {product.subCategory}
          </Badge>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-500">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {product.averageRating?.toFixed(1)}
          </span>
        </div>

        <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{product.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {product.brand} · SKU {product.sku}
        </p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
              ₹{product.monthlyRentalPrice?.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/mo</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ₹{product.securityDeposit?.toLocaleString('en-IN')} deposit
            </p>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <MapPin size={12} /> {product.city?.name}
          </span>
        </div>
      </Link>
    </Card>
  );
}

export default memo(VendorProductCard);
