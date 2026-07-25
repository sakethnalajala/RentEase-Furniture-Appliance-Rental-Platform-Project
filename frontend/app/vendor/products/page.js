'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Search, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Select from '@/components/ui/Select';
import VendorProductCard from '@/components/vendor/VendorProductCard';
import {
  useGetMyVendorProfileQuery,
  useListVendorCategoriesQuery,
  useListMySubCategoriesQuery,
  useListMyProductsQuery,
} from '@/store/vendorApi';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'discount', label: 'Highest Discount' },
];

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function VendorProductsContent() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: profileData } = useGetMyVendorProfileQuery();
  const vendorId = profileData?.data?._id;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => setPage(1), [debouncedSearch, category, subCategory, sort, selectedCity?.id]);

  const { data: categoriesData } = useListVendorCategoriesQuery();
  const { data: subCategoriesData } = useListMySubCategoriesQuery(
    { category: category || undefined, vendor: vendorId },
    { skip: !vendorId }
  );
  const { data, isLoading, isFetching } = useListMyProductsQuery(
    {
      vendor: vendorId,
      city: selectedCity?.id,
      category: category || undefined,
      subCategory: subCategory || undefined,
      search: debouncedSearch || undefined,
      sort,
      page,
      limit: 12,
    },
    { skip: !vendorId }
  );

  const categories = categoriesData?.data || [];
  const subCategories = subCategoriesData?.data || [];
  const items = data?.data?.items || [];
  const pages = data?.data?.pages || 1;
  const total = data?.data?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your products</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {total.toLocaleString('en-IN')} products across furniture and appliances.
        </p>
      </div>

      <Card variant="glass" className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search your catalog by name, brand or type…"
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
            All categories
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

        <div className="flex items-center justify-end border-t border-slate-200/70 pt-3 dark:border-white/10">
          <Select value={sort} onChange={setSort} options={SORTS} className="w-52" />
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <PackageSearch size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No products match your filters.</p>
        </Card>
      ) : (
        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
          {items.map((product) => (
            <VendorProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 disabled:opacity-40 dark:border-white/10"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 disabled:opacity-40 dark:border-white/10"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function VendorProductsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <VendorProductsContent />
    </Suspense>
  );
}
