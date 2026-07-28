'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  IndianRupee, ShoppingBag, TrendingUp, Star, Boxes, Truck, RotateCcw, XCircle, Users, Award, Info,
  Trophy, Zap, Package, ShieldCheck, ImageOff, Phone,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import {
  useGetMyVendorProfileQuery, useGetMyVendorStatsQuery, useListMyProductsQuery,
  useListVendorDeliveryPartnersQuery, useGetVendorDeliveryAnalyticsQuery,
} from '@/store/vendorApi';
import { buildVendorAnalytics } from '@/lib/mockVendorData';
import { statusLabel, formatDate } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';
import {
  MagnitudeBarChart, StatusBreakdownChart, WeeklyTrendChart, LineAreaChart, PieDonutChart,
  ProgressRing, CountUpNumber,
} from '@/components/vendor/AnalyticsCharts';

const DELIVERY_ORDERS_PAGE_SIZE = 20;

// Which single number from each leaderboard entry's full `performance` object best represents
// *why* that partner won its category — mirrors the exact metric backend/src/controllers/
// vendor.controller.js's `getDeliveryAnalytics` ranks that category by (successRate,
// avgDeliveryMinutes asc, customerRating desc, productsDelivered, cancellationRate asc).
const LEADERBOARD_META = {
  topPerforming: {
    label: 'Top Performing',
    icon: Trophy,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    metric: (v) => `${v.successRate}% success rate`,
  },
  fastest: {
    label: 'Fastest Delivery',
    icon: Zap,
    accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    metric: (v) => (v.avgDeliveryMinutes ? `${v.avgDeliveryMinutes} min avg` : '—'),
  },
  highestRated: {
    label: 'Highest Rated',
    icon: Star,
    accent: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
    metric: (v) => (v.customerRating ? `${v.customerRating.toFixed(1)} ★ rating` : '—'),
  },
  mostDeliveries: {
    label: 'Most Deliveries',
    icon: Package,
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    metric: (v) => `${v.productsDelivered} delivered`,
  },
  lowestCancellation: {
    label: 'Lowest Cancellation',
    icon: ShieldCheck,
    accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    metric: (v) => `${v.cancellationRate}% cancelled`,
  },
};

function KPICard({ icon: Icon, label, value, prefix = '', suffix = '', decimals = 0, accent, sub }) {
  return (
    <Card variant="glass" hover className="p-5 transition-shadow duration-300 hover:shadow-glow">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
        <CountUpNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <Card variant="glass" className={`p-5 ${className}`}>
      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

const money = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export default function VendorAnalyticsPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: profileData } = useGetMyVendorProfileQuery();
  const vendorId = profileData?.data?._id;
  const { data: statsData, isLoading: statsLoading } = useGetMyVendorStatsQuery({ city: selectedCity?.id }, { pollingInterval: LIVE_POLL_MS });
  const { data: productsData, isLoading: productsLoading } = useListMyProductsQuery(
    { vendor: vendorId, city: selectedCity?.id, sort: 'newest', limit: 48 },
    { skip: !vendorId }
  );
  const { data: partnersData, isLoading: partnersLoading } = useListVendorDeliveryPartnersQuery({ city: selectedCity?.id });
  const { data: deliveryAnalyticsData, isLoading: deliveryAnalyticsLoading } = useGetVendorDeliveryAnalyticsQuery(
    { city: selectedCity?.id },
    { pollingInterval: LIVE_POLL_MS }
  );

  const stats = statsData?.data;
  const products = productsData?.data?.items || [];
  const a = useMemo(() => buildVendorAnalytics(products, stats), [products, stats]);

  const partners = partnersData?.data || [];
  const deliveryAnalytics = deliveryAnalyticsData?.data;
  const leaderboard = deliveryAnalytics?.leaderboard;
  const deliveryOrders = deliveryAnalytics?.orders || [];

  const deliveriesByPartner = useMemo(
    () =>
      [...partners]
        .map((p) => ({ label: p.user?.name || 'Partner', value: p.performance?.productsDelivered || 0 }))
        .sort((x, y) => y.value - x.value),
    [partners]
  );

  const [visibleOrders, setVisibleOrders] = useState(DELIVERY_ORDERS_PAGE_SIZE);
  const visibleDeliveryOrders = deliveryOrders.slice(0, visibleOrders);
  const hasMoreOrders = visibleOrders < deliveryOrders.length;

  const loading = statsLoading || productsLoading;
  const deliveryLoading = partnersLoading || deliveryAnalyticsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectedCity
              ? `Performance for your catalog in ${selectedCity.name}, with demo order activity layered on top.`
              : 'Performance across your real catalog in every city you operate in, with demo order activity layered on top.'}
          </p>
        </div>
        <Badge variant="neutral" className="flex items-center gap-1.5">
          <Info size={12} /> Order-derived figures use realistic demo activity
        </Badge>
      </div>

      {selectedCity && products.length === 0 && (
        <Card variant="glass" className="flex items-center gap-3 p-4">
          <Info size={18} className="shrink-0 text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You don&apos;t have any products listed in {selectedCity.name} yet, so analytics below are empty for this city.
            Switch cities from the header to see your other locations.
          </p>
        </Card>
      )}

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={IndianRupee} label="Revenue this year" value={a.totalRevenueThisYear} prefix="₹" accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
        <KPICard icon={ShoppingBag} label="Total orders (demo)" value={a.totalOrders} accent="bg-accent-500/10 text-accent-600 dark:text-accent-300" />
        <KPICard icon={TrendingUp} label="Average order value" value={a.avgOrderValue} prefix="₹" accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <KPICard icon={Star} label="Catalog average rating" value={stats?.averageRating || 0} decimals={1} accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Score rings + secondary KPIs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Vendor performance score" subtitle="Blends catalog rating, stock health & fulfillment rate">
          <div className="flex justify-center">
            <ProgressRing value={a.vendorPerformanceScore} label="Overall score" hue="#6366f1" />
          </div>
        </ChartCard>
        <ChartCard title="Conversion rate" subtitle="Views to confirmed rentals (demo)">
          <div className="flex justify-center">
            <ProgressRing value={a.conversionRate} label="Conversion" hue="#f97316" />
          </div>
        </ChartCard>
        <ChartCard title="Inventory utilization" subtitle="Units currently rented vs. total stock">
          <div className="flex justify-center">
            <ProgressRing value={a.inventoryUtilization} label="Utilization" hue="#10b981" />
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card variant="glass" className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300"><Truck size={16} /></span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-white"><CountUpNumber value={a.activeRentals} /></p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Active rentals</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><Boxes size={16} /></span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-white"><CountUpNumber value={a.pendingDeliveries} /></p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Pending deliveries</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><RotateCcw size={16} /></span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-white"><CountUpNumber value={a.returnedProducts} /></p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Returned products</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400"><XCircle size={16} /></span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-white"><CountUpNumber value={a.cancelledOrders} /></p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Cancelled orders</p>
          </div>
        </Card>
      </div>

      {/* Revenue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue — last 12 months" subtitle="Monthly revenue trend (demo order activity)">
          <LineAreaChart data={a.monthlyRevenue} formatValue={money} hue="#6366f1" />
        </ChartCard>
        <ChartCard title="Monthly revenue" subtitle="Same trend, bar view">
          <WeeklyTrendChart weeks={a.monthlyRevenue} formatValue={money} />
        </ChartCard>
      </div>

      {/* Orders */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Orders trend" subtitle="Monthly order volume">
          <LineAreaChart data={a.monthlyOrders} hue="#f97316" />
        </ChartCard>
        <ChartCard title="Weekly orders" subtitle="Last 8 weeks">
          <WeeklyTrendChart weeks={a.weeklyOrders} />
        </ChartCard>
        <ChartCard title="Monthly orders" subtitle="Last 12 months, bar view">
          <WeeklyTrendChart weeks={a.monthlyOrders.slice(-6)} />
        </ChartCard>
      </div>

      {/* Yearly comparison + revenue comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Yearly revenue comparison" subtitle="This year vs. last year">
          <WeeklyTrendChart weeks={a.yearlyRevenue} formatValue={money} />
        </ChartCard>
        <ChartCard title="Revenue comparison by category" subtitle="Furniture vs. Appliances">
          <WeeklyTrendChart weeks={a.revenueByCategory} formatValue={money} />
        </ChartCard>
      </div>

      {/* Growth */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Inventory growth" subtitle="Demo-illustrative catalog growth curve">
          <LineAreaChart data={a.inventoryGrowth} hue="#10b981" />
        </ChartCard>
        <ChartCard title="Customer growth" subtitle="Cumulative distinct customers (demo order activity)">
          <LineAreaChart data={a.customerGrowth} hue="#8b5cf6" />
        </ChartCard>
      </div>

      {/* Top performers */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Top selling categories" subtitle="Real product counts by subcategory">
          <MagnitudeBarChart data={a.topCategories} />
        </ChartCard>
        <ChartCard title="Top selling products" subtitle="Real lifetime units rented" className="lg:col-span-2">
          <div className="space-y-3">
            {a.topProducts.map((p) => (
              <div key={p.label} className="flex items-center gap-3">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.label} loading="lazy" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                    <Award size={14} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-600 dark:text-slate-300">{p.label}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-white">{p.value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-500"
                      style={{ width: `${Math.max(4, Math.round((p.value / (a.topProducts[0]?.value || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Ratings, duration, city/status breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Product rating distribution" subtitle="Real catalog ratings, bucketed by star">
          <MagnitudeBarChart data={a.ratingDistribution} />
        </ChartCard>
        <ChartCard title="Rental duration analysis" subtitle="Orders grouped by plan length (demo)">
          <WeeklyTrendChart weeks={a.rentalDurationAnalysis} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="City-wise orders" subtitle="Order volume by delivery city (demo)">
          <WeeklyTrendChart weeks={a.ordersByCity} />
        </ChartCard>
        <ChartCard title="Revenue by city" subtitle="Revenue split across delivery cities (demo)">
          <PieDonutChart data={a.revenueByCity} donut />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue by category" subtitle="Furniture vs. Appliances (demo)">
          <PieDonutChart data={a.revenueByCategory} donut={false} />
        </ChartCard>
        <ChartCard title="Order status breakdown" subtitle="Demo orders grouped by fulfillment stage">
          <StatusBreakdownChart counts={a.statusCounts} />
        </ChartCard>
      </div>

      <ChartCard title="Stock by category" subtitle="Real stock units across your top subcategories">
        {(stats?.bySubCategory || []).length > 0 ? (
          <MagnitudeBarChart data={stats.bySubCategory.slice(0, 8).map((s) => ({ label: s._id, value: s.totalStock }))} valueSuffix=" units" />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No stock data yet.</p>
        )}
      </ChartCard>

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Users size={12} /> Order/customer/city figures are generated from realistic demo activity layered on your real product catalog — no live Order backend exists yet.
      </p>

      {/* ================= Delivery Partner Analytics (real, live data) ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-6 dark:border-white/10">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Delivery partner analytics</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real performance figures for the delivery partners handling your orders
            {selectedCity ? ` in ${selectedCity.name}` : ''}.
          </p>
        </div>
        <Badge variant="success" className="flex items-center gap-1.5">
          <Truck size={12} /> {deliveryAnalytics ? `${deliveryAnalytics.fleetSize} partners in fleet` : 'Live data'}
        </Badge>
      </div>

      {deliveryLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Leaderboard */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Delivery partner leaderboard
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(LEADERBOARD_META).map(([key, meta]) => {
                const entry = leaderboard?.[key];
                const Icon = meta.icon;
                return (
                  <Card key={key} variant="glass" hover className="p-5 transition-shadow duration-300 hover:shadow-glow">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.accent}`}>
                      <Icon size={18} />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{meta.label}</p>
                    {entry ? (
                      <>
                        <p className="mt-1 truncate font-display text-base font-bold text-slate-900 dark:text-white">{entry.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{meta.metric(entry.value)}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">Not enough data yet</p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Deliveries by partner */}
          <ChartCard title="Deliveries by partner" subtitle="Products delivered per partner for your orders">
            {deliveriesByPartner.length > 0 ? (
              <MagnitudeBarChart data={deliveriesByPartner} valueSuffix=" delivered" />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No delivery activity yet.</p>
            )}
          </ChartCard>

          {/* Which delivery partner delivered which order */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Deliveries by order
              </h3>
              {deliveryOrders.length > 0 && (
                <p className="text-xs text-slate-400">
                  Showing {visibleDeliveryOrders.length} of {deliveryOrders.length}
                </p>
              )}
            </div>

            {deliveryOrders.length === 0 ? (
              <Card variant="glass" className="mt-3 flex flex-col items-center gap-2 p-10 text-center">
                <Package size={26} className="text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No delivered orders yet.</p>
              </Card>
            ) : (
              <>
                <Card variant="glass" className="mt-3 overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium">Customer</th>
                          <th className="px-4 py-3 font-medium">Delivery partner</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Delivered</th>
                          <th className="px-4 py-3 font-medium">Rating &amp; review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDeliveryOrders.map((o) => (
                          <tr key={o.orderItemId} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {o.productImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={o.productImage} alt={o.productName} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                                    <ImageOff size={14} />
                                  </div>
                                )}
                                <span className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white">{o.productName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{o.customerName}</td>
                            <td className="px-4 py-3">
                              <p className="text-slate-600 dark:text-slate-300">{o.deliveryPartnerName || '—'}</p>
                              {o.deliveryPartnerPhone && (
                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                  <Phone size={10} /> {o.deliveryPartnerPhone}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <OrderStatusBadge status={statusLabel(o.status)} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                              {o.deliveryDate ? formatDate(o.deliveryDate) : '—'}
                              {o.deliveryTime ? ` · ${o.deliveryTime}` : ''}
                            </td>
                            <td className="px-4 py-3">
                              {o.rating ? (
                                <div className="flex items-center gap-1">
                                  <Star size={13} className="fill-amber-400 text-amber-400" />
                                  <span className="font-medium text-slate-900 dark:text-white">{o.rating}</span>
                                  {o.review && (
                                    <span className="ml-1 max-w-[160px] truncate text-xs text-slate-400" title={o.review}>
                                      &ldquo;{o.review}&rdquo;
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Not rated</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {hasMoreOrders && (
                  <div className="flex items-center justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => setVisibleOrders((v) => Math.min(v + DELIVERY_ORDERS_PAGE_SIZE, deliveryOrders.length))}
                      className="focus-ring rounded-full border border-slate-200/70 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-600 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
