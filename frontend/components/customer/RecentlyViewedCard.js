'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useGetProductQuery } from '@/store/customerApi';
import Skeleton from '@/components/ui/Skeleton';
import ProgressiveImage from '@/components/ui/ProgressiveImage';

// One RTK Query hook call per rendered card — correct per rules-of-hooks (each id gets its
// own component instance) and cheap since RTK Query already has these cached from Browse.
function RecentlyViewedCard({ productId }) {
  const { data, isLoading } = useGetProductQuery(productId);
  const product = data?.data?.product;

  if (isLoading) return <Skeleton className="h-32 w-40 shrink-0 rounded-xl" />;
  if (!product) return null;

  return (
    <Link href={`/customer/browse/${product._id}`} className="w-40 shrink-0">
      <ProgressiveImage
        src={product.images?.[0]}
        alt={product.name}
        className="h-24 w-40 rounded-xl"
        imgClassName="transition-transform hover:scale-105"
      />
      <p className="mt-1.5 line-clamp-1 text-xs font-medium text-slate-700 dark:text-slate-200">{product.name}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">₹{product.monthlyRentalPrice.toLocaleString('en-IN')}/mo</p>
    </Link>
  );
}

export default memo(RecentlyViewedCard);
