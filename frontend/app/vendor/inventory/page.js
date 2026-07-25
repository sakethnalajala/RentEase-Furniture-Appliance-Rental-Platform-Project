'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import { Search, AlertTriangle, Boxes, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useGetMyVendorProfileQuery, useListMyProductsQuery } from '@/store/vendorApi';

function StockBadge({ stock }) {
  if (stock <= 2) {
    return (
      <Badge variant="neutral" className="!bg-rose-100 !text-rose-700 dark:!bg-rose-500/15 dark:!text-rose-300">
        <AlertTriangle size={11} /> {stock} left
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge variant="neutral" className="!bg-amber-100 !text-amber-700 dark:!bg-amber-500/15 dark:!text-amber-300">
        {stock} left
      </Badge>
    );
  }
  return <Badge variant="success">{stock} in stock</Badge>;
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: profileData } = useGetMyVendorProfileQuery();
  const vendorId = profileData?.data?._id;

  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('filter') === 'low');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search, lowStockOnly, selectedCity?.id]);

  const { data, isLoading } = useListMyProductsQuery(
    { vendor: vendorId, city: selectedCity?.id, search: search || undefined, sort: 'newest', page, limit: 24 },
    { skip: !vendorId }
  );

  const allItems = data?.data?.items || [];
  const items = useMemo(() => (lowStockOnly ? allItems.filter((p) => p.stock <= 5) : allItems), [allItems, lowStockOnly]);
  const pages = data?.data?.pages || 1;
  const total = data?.data?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Inventory & stock management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {total.toLocaleString('en-IN')} products in your catalog · {allItems.filter((p) => p.stock <= 2).length} critically low on this page
        </p>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search SKU, name or brand…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <button
          type="button"
          onClick={() => setLowStockOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
            lowStockOnly
              ? 'bg-rose-500 text-white'
              : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
          }`}
        >
          <AlertTriangle size={13} /> Low stock only
        </button>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <Boxes size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No products match this view.</p>
        </Card>
      ) : (
        <Card variant="glass" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Monthly rent</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt={p.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                            <ImageOff size={14} />
                          </div>
                        )}
                        <span className="max-w-[220px] truncate font-medium text-slate-900 dark:text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.subCategory}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.city?.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">₹{p.monthlyRentalPrice?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <StockBadge stock={p.stock} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!lowStockOnly && pages > 1 && (
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

export default function VendorInventoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <InventoryContent />
    </Suspense>
  );
}
