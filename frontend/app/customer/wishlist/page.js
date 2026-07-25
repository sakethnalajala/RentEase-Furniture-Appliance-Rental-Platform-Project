'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import ProductCard from '@/components/customer/ProductCard';
import { useGetWishlistQuery } from '@/store/customerApi';
import { useWishlistToggle } from '@/hooks/useWishlistToggle';

export default function WishlistPage() {
  const { data, isLoading } = useGetWishlistQuery();
  const { wishlistIds, toggle, isLoading: toggling } = useWishlistToggle();

  const products = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your wishlist</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Products you’ve saved for later.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <Heart size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing saved yet.</p>
          <Link href="/customer/browse" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            Browse products
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              isWishlisted={wishlistIds.has(product._id)}
              onToggleWishlist={toggle}
              wishlistLoading={toggling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
