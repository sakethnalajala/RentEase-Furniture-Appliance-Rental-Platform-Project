'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Star, Truck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressiveImage from '@/components/ui/ProgressiveImage';

function ProductCard({ product, isWishlisted, onToggleWishlist, wishlistLoading }) {
  const vendorName = product.isRentEaseOwned ? 'RentEase' : product.vendor?.businessName || 'Vendor';
  const inStock = product.stock > 0 && product.availabilityStatus === 'active';
  const image = product.images?.[0];

  return (
    <Card variant="glass" tilt className="group flex h-full flex-col overflow-hidden p-0 transition-shadow duration-300 hover:shadow-glow">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProgressiveImage
          src={image}
          alt={product.name}
          className="h-full w-full"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleWishlist?.(product);
          }}
          disabled={wishlistLoading}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="focus-ring absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur transition-transform hover:scale-110 dark:bg-slate-900/70 dark:text-slate-300"
        >
          <motion.span whileTap={{ scale: 0.8 }} className="flex">
            <Heart size={16} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
          </motion.span>
        </button>

        {!inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white">
            Unavailable
          </span>
        )}
      </div>

      <Link href={`/customer/browse/${product._id}`} className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="neutral" className="truncate">
            {product.subCategory}
          </Badge>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-500">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {product.averageRating?.toFixed(1)}
            <span className="text-slate-400 dark:text-slate-500">({product.numReviews})</span>
          </span>
        </div>

        <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{product.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {product.brand} · {product.city?.name}
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
            <Truck size={12} /> {product.estimatedDeliveryDays}d
          </span>
        </div>

        <p className="mt-2 truncate text-[11px] text-slate-400 dark:text-slate-500">Sold by {vendorName}</p>
      </Link>
    </Card>
  );
}

export default memo(ProductCard);
