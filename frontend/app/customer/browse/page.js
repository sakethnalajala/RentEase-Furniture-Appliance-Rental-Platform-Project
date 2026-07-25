'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Search, PackageSearch, Loader2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Select from '@/components/ui/Select';
import ProductCard from '@/components/customer/ProductCard';
import BrowseCollections from '@/components/customer/BrowseCollections';
import {
  useListCategoriesQuery,
  useListSubCategoriesQuery,
  useListProductsQuery,
} from '@/store/customerApi';
import { useWishlistToggle } from '@/hooks/useWishlistToggle';

// `value` is the UI-facing selection id (must be unique for the Select component); `apiSort`
// is the backend `sort` param actually sent. "Newest" and "Recently Added" are genuinely the
// same createdAt-desc ordering — common as two menu labels for the same freshness sort on
// real e-commerce sites — so they share an apiSort while staying distinct, independently
// selectable menu entries.
const SORTS = [
  { value: 'newest', label: 'Newest', apiSort: 'newest' },
  { value: 'price_asc', label: 'Price: Low to High', apiSort: 'price_asc' },
  { value: 'price_desc', label: 'Price: High to Low', apiSort: 'price_desc' },
  { value: 'rating', label: 'Top Rated', apiSort: 'rating' },
  { value: 'popular', label: 'Most Popular', apiSort: 'popular' },
  { value: 'best_selling', label: 'Best Selling', apiSort: 'best_selling' },
  { value: 'recently_added', label: 'Recently Added', apiSort: 'newest' },
  { value: 'discount', label: 'Highest Discount', apiSort: 'discount' },
];

const SORT_TO_API = Object.fromEntries(SORTS.map((s) => [s.value, s.apiSort]));

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const selectedCity = useSelector((state) => state.city.selectedCity);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [subCategory, setSubCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState([]);
  const sentinelRef = useRef(null);

  const debouncedSearch = useDebouncedValue(search);
  const debouncedMin = useDebouncedValue(minPrice);
  const debouncedMax = useDebouncedValue(maxPrice);

  const isDefaultView = !debouncedSearch && !category && !subCategory && !debouncedMin && !debouncedMax && sort === 'newest';

  // Any filter change resets pagination back to page 1 and clears the accumulated (infinite
  // scroll) list so the new query's page 1 isn't appended after stale results.
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch, category, subCategory, debouncedMin, debouncedMax, sort, selectedCity?.id]);

  const { data: categoriesData } = useListCategoriesQuery();
  const { data: subCategoriesData } = useListSubCategoriesQuery({ category: category || undefined, city: selectedCity?.id });
  const { data, isLoading, isFetching, error } = useListProductsQuery({
    city: selectedCity?.id,
    category: category || undefined,
    subCategory: subCategory || undefined,
    search: debouncedSearch || undefined,
    minPrice: debouncedMin || undefined,
    maxPrice: debouncedMax || undefined,
    sort: SORT_TO_API[sort] || 'newest',
    page,
    limit: 12,
  });
  const { wishlistIds, toggle, isLoading: wishlistToggling } = useWishlistToggle();

  // A brand-new args combo (first page of a fresh filter) is "still loading" for our purposes
  // even before RTK Query's own `isLoading` flips true, and stays "loading" through every page
  // of that same combo until data for it actually lands — this is what stops the empty-state
  // message from flashing before the real result arrives.
  const isResolvingQuery = (isLoading || isFetching) && accumulated.length === 0;

  const categories = categoriesData?.data || [];
  const subCategories = subCategoriesData?.data || [];
  const pages = data?.data?.pages || 1;
  const total = data?.data?.total || 0;

  // Append each new page's items to the running list (dedupe defends against a StrictMode
  // double-invoke or a re-fetch of the same page landing twice).
  useEffect(() => {
    const items = data?.data?.items;
    if (!items) return;
    setAccumulated((prev) => {
      if (page === 1) return items;
      const seen = new Set(prev.map((p) => p._id));
      return [...prev, ...items.filter((p) => !seen.has(p._id))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const hasMore = page < pages;

  useEffect(() => {
    if (!hasMore) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) setPage((p) => p + 1);
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetching]);

  const cityLabel = useMemo(() => selectedCity?.name || 'all cities', [selectedCity]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Browse rentals</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {total > 0 ? `${total.toLocaleString('en-IN')} products` : 'Showing inventory'} in {cityLabel}.
        </p>
      </div>

      <Card variant="glass" className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, brand or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setSubCategory('');
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              !category
                ? 'bg-brand-500 text-white'
                : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => {
                setCategory(cat._id);
                setSubCategory('');
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                category === cat._id
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {subCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200/70 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={() => setSubCategory('')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !subCategory
                  ? 'border-brand-500 text-brand-600 dark:text-brand-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              All types
            </button>
            {subCategories.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setSubCategory(sc)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  subCategory === sc
                    ? 'border-brand-500 text-brand-600 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="focus-ring w-24 rounded-lg border border-slate-300 bg-white/70 px-2.5 py-1.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="focus-ring w-24 rounded-lg border border-slate-300 bg-white/70 px-2.5 py-1.5 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <Select value={sort} onChange={setSort} options={SORTS} className="ml-auto w-52" />
        </div>
      </Card>

      <div>
        {isResolvingQuery ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
            <PackageSearch size={32} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Couldn&apos;t load products right now. Please try again.</p>
          </Card>
        ) : accumulated.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
            <PackageSearch size={32} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No products match your filters. Try widening your search.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {accumulated.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  isWishlisted={wishlistIds.has(product._id)}
                  onToggleWishlist={toggle}
                  wishlistLoading={wishlistToggling}
                />
              ))}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="mt-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => !isFetching && setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="focus-ring flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-600 backdrop-blur transition-colors hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  {isFetching ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Loading more…
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}

            {!hasMore && accumulated.length > 0 && (
              <p className="mt-8 text-center text-xs text-slate-400">
                You&apos;ve reached the end — {accumulated.length} of {total.toLocaleString('en-IN')} products shown.
              </p>
            )}
          </>
        )}
      </div>

      {isDefaultView && (
        <div className="border-t border-slate-200/70 pt-8 dark:border-white/10">
          <BrowseCollections cityId={selectedCity?.id} />
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <BrowseContent />
    </Suspense>
  );
}
