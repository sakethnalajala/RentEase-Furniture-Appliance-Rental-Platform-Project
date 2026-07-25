'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import ProductCard from '@/components/customer/ProductCard';
import { useListProductsQuery } from '@/store/customerApi';
import { useWishlistToggle } from '@/hooks/useWishlistToggle';

export default function ProductRail({ title, subtitle, icon: Icon, params, seeAllHref, accent = 'from-brand-500 to-accent-500' }) {
  const scrollerRef = useRef(null);
  const { data, isLoading } = useListProductsQuery({ ...params, limit: params.limit || 10 });
  const { wishlistIds, toggle, isLoading: wishlistToggling } = useWishlistToggle();

  const items = data?.data?.items || [];

  const scroll = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (!isLoading && items.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white`}>
              <Icon size={15} />
            </span>
          )}
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white sm:text-lg">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {seeAllHref && (
            <Link href={seeAllHref} className="hidden items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400 sm:flex">
              See all <ArrowRight size={11} />
            </Link>
          )}
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-64 shrink-0 rounded-2xl" />)
          : items.map((product) => (
              <div key={product._id} className="w-64 shrink-0">
                <ProductCard
                  product={product}
                  isWishlisted={wishlistIds.has(product._id)}
                  onToggleWishlist={toggle}
                  wishlistLoading={wishlistToggling}
                />
              </div>
            ))}
      </div>
    </div>
  );
}
