'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  IndianRupee, ShoppingBag, CalendarClock, Users, Building2, Truck, Package, Wallet,
  Hourglass, TrendingUp, Trophy, Percent, RotateCcw, Sparkles, MapPin, Star, Boxes,
  XCircle, PackageCheck, Gauge, Award, Flame,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import {
  useGetAdminAnalyticsQuery,
  useAdminListCategoriesQuery,
  useListVendorApplicationsQuery,
  useAdminListDeliveryPartnersQuery,
  useAdminListCustomersQuery,
} from '@/store/adminApi';
import {
  LineAreaChart, WeeklyTrendChart, MagnitudeBarChart, PieDonutChart, StatusBreakdownChart,
  ProgressRing, CountUpNumber,
} from '@/components/vendor/AnalyticsCharts';
import { fadeInUp, staggerContainer } from '@/lib/motion';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthLabel = ({ year, month }) => `${MONTH_SHORT[month - 1] || month} '${String(year).slice(2)}`;
const dayLabel = ({ month, day }) => `${MONTH_SHORT[month - 1] || month} ${day}`;
const hourLabel = (h) => (h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`);
const money = (v) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;

const GROUPS = {
  pending: ['pending'],
  active: ['confirmed', 'preparing', 'out_for_delivery', 'active_rental', 'extension_requested', 'pickup_scheduled'],
  completed: ['delivered', 'returned', 'completed'],
  cancelled: ['cancelled'],
};

const RENTAL_STATUS_LABELS = {
  active_rental: 'Active',
  extension_requested: 'Extension requested',
  pickup_scheduled: 'Pickup scheduled',
  returned: 'Returned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const RANGE_PRESETS = [
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: '12m', label: '12 Months', days: 365 },
  { key: 'all', label: 'All Time', days: null },
];

function presetToRange(preset) {
  const now = new Date();
  if (preset === 'all') return { startDate: '2015-01-01T00:00:00.000Z', endDate: now.toISOString() };
  const days = RANGE_PRESETS.find((p) => p.key === preset)?.days || 365;
  return { startDate: new Date(now.getTime() - days * 86400000).toISOString(), endDate: now.toISOString() };
}

function ChartCard({ title, subtitle, children, className = '', icon: Icon }) {
  return (
    <Card variant="glass" hover className={`p-5 transition-shadow duration-300 hover:shadow-glow ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-brand-500 dark:text-brand-300" />}
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function KPICard({ icon: Icon, label, value, prefix = '', suffix = '', accent }) {
  return (
    <Card variant="glass" hover className="p-4 transition-shadow duration-300 hover:shadow-glow sm:p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${accent}`}>
        <Icon size={16} />
      </div>
      <p className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
        <CountUpNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
    </Card>
  );
}

function Leaderboard({ items, renderMeta, renderValue }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.key} className="flex items-center gap-3 rounded-xl bg-slate-900/[0.03] px-3 py-2.5 dark:bg-white/5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400">
            {i === 0 ? <Trophy size={13} /> : i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
            <p className="text-xs text-slate-400">{renderMeta(item)}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">{renderValue(item)}</span>
        </div>
      ))}
    </div>
  );
}

// Day-of-week (rows, Sun-Sat) x hour-of-day (columns, 0-23) order-volume heatmap. Sequential
// single-hue intensity per the dataviz method already used across this app's other charts —
// hover tooltip via native `title` gives the exact count per cell.
function ActivityHeatmap({ grid }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex pl-10">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-slate-400">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>
        <div className="mt-1 space-y-0.5">
          {grid.map((row, dow) => (
            <div key={dow} className="flex items-center gap-0.5">
              <div className="w-10 shrink-0 pr-2 text-right text-[10px] text-slate-400">{DAY_SHORT[dow]}</div>
              <div className="flex flex-1 gap-0.5">
                {row.map((count, hour) => (
                  <div
                    key={hour}
                    title={`${DAY_SHORT[dow]} ${hourLabel(hour)}: ${count} order${count === 1 ? '' : 's'}`}
                    className="aspect-square flex-1 rounded-sm transition-transform hover:scale-125"
                    style={{ backgroundColor: `rgba(99,102,241,${0.08 + (count / max) * 0.85})` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const [rangePreset, setRangePreset] = useState('12m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const { startDate: presetStart, endDate: presetEnd } = useMemo(() => presetToRange(rangePreset), [rangePreset]);
  const startDate = customStart ? new Date(customStart).toISOString() : presetStart;
  const endDate = customEnd ? new Date(`${customEnd}T23:59:59`).toISOString() : presetEnd;

  const selectPreset = (key) => {
    setRangePreset(key);
    setCustomStart('');
    setCustomEnd('');
  };

  // Polling keeps every chart/KPI on this page "live" — no manual refresh needed to see a new
  // order/payment/registration reflected here (RTK Query re-fetches on this interval and only
  // re-renders what actually changed).
  const { data, isLoading, isFetching } = useGetAdminAnalyticsQuery(
    {
      city: selectedCity?.id,
      startDate,
      endDate,
      category: categoryFilter || undefined,
      vendor: vendorFilter || undefined,
      deliveryPartner: partnerFilter || undefined,
      customer: customerFilter || undefined,
    },
    { pollingInterval: 20000 }
  );

  const { data: categoriesData } = useAdminListCategoriesQuery();
  const { data: vendorsData } = useListVendorApplicationsQuery({ status: 'approved', city: selectedCity?.id });
  const { data: partnersData } = useAdminListDeliveryPartnersQuery({ status: 'approved', city: selectedCity?.id });
  const { data: customersData } = useAdminListCustomersQuery({ city: selectedCity?.id, sort: 'name_asc', limit: 100 });

  const categoryOptions = [{ value: '', label: 'All categories' }, ...(categoriesData?.data || []).map((c) => ({ value: c._id, label: c.name }))];
  const vendorOptions = [{ value: '', label: 'All vendors' }, ...(vendorsData?.data || []).map((v) => ({ value: v._id, label: v.businessName }))];
  const partnerOptions = [{ value: '', label: 'All delivery partners' }, ...(partnersData?.data || []).map((p) => ({ value: p._id, label: p.user?.name || 'Partner' }))];
  const customerOptions = [{ value: '', label: 'All customers' }, ...(customersData?.data?.items || []).map((c) => ({ value: c._id, label: c.name }))];

  const a = data?.data;
  const overview = a?.overview || {};

  const revenueTrend = useMemo(() => (a?.trends?.revenue || []).map((s) => ({ label: monthLabel(s), value: s.revenue })), [a]);
  const ordersTrendData = useMemo(() => (a?.trends?.orders || []).map((s) => ({ label: monthLabel(s), value: s.count })), [a]);
  const rentalsTrend = useMemo(() => (a?.trends?.rentals || []).map((s) => ({ label: monthLabel(s), value: s.count })), [a]);
  const weeklyRevenue = useMemo(
    () => (a?.trends?.weeklyRevenue || []).map((s) => ({ label: `W${s.isoWeek}`, value: s.revenue })),
    [a]
  );
  const dailyRevenue = useMemo(() => (a?.trends?.dailyRevenue || []).map((s) => ({ label: dayLabel(s), value: s.revenue })), [a]);
  const peakHours = useMemo(() => (a?.trends?.peakRentalHours || []).map((h) => ({ label: hourLabel(h.hour), value: h.count })), [a]);
  const vendorGrowthTrend = useMemo(() => (a?.trends?.vendorGrowth || []).map((s) => ({ label: monthLabel(s), value: s.count })), [a]);

  const statusCounts = a?.ordersByStatus || {};
  const groupedCounts = useMemo(() => {
    const out = { pending: 0, active: 0, completed: 0, cancelled: 0 };
    Object.entries(GROUPS).forEach(([group, statuses]) => {
      out[group] = statuses.reduce((sum, s) => sum + (statusCounts[s] || 0), 0);
    });
    return out;
  }, [statusCounts]);

  const rentalStatusData = useMemo(
    () =>
      Object.entries(RENTAL_STATUS_LABELS)
        .map(([key, label]) => ({ label, value: statusCounts[key] || 0 }))
        .filter((d) => d.value > 0),
    [statusCounts]
  );

  const revenueByCategory = useMemo(() => (a?.revenueByCategory || []).map((c) => ({ label: c.category, value: c.revenue })), [a]);
  const productCountByCategory = useMemo(() => (a?.productCountByCategory || []).map((c) => ({ label: c.category, value: c.count })), [a]);
  const customerGrowth = useMemo(() => (a?.customerGrowth || []).map((c) => ({ label: monthLabel(c), value: c.count })), [a]);

  const vendorPerformance = a?.vendorPerformance || [];
  const vendorBars = useMemo(() => vendorPerformance.map((v) => ({ label: v.businessName, value: v.revenue })), [vendorPerformance]);

  const deliveryPerformance = a?.deliveryPerformance || [];
  const deliveryBars = useMemo(
    () => deliveryPerformance.map((p) => ({ label: p.name || 'Partner', value: p.completedDeliveries })),
    [deliveryPerformance]
  );

  const cityComparison = a?.cityComparison || [];
  const cityRevenueBars = useMemo(
    () => cityComparison.map((c) => ({ label: c.cityName, value: c.revenue })).sort((x, y) => y.value - x.value),
    [cityComparison]
  );
  const cityOrdersBars = useMemo(
    () => cityComparison.map((c) => ({ label: c.cityName, value: c.orders })).sort((x, y) => y.value - x.value),
    [cityComparison]
  );
  const cityRentalsBars = useMemo(
    () => cityComparison.map((c) => ({ label: c.cityName, value: c.rentals })).sort((x, y) => y.value - x.value),
    [cityComparison]
  );

  const topRentingProducts = a?.topRentingProducts || [];
  const topRentingBars = useMemo(() => topRentingProducts.map((p) => ({ label: p.name, value: p.unitsRented })), [topRentingProducts]);
  const topSellingProducts = a?.topSellingProducts || [];
  const topSellingBars = useMemo(() => topSellingProducts.map((p) => ({ label: p.name, value: p.orders })), [topSellingProducts]);

  const paymentMethods = a?.paymentMethods || {};
  const paymentMethodData = useMemo(
    () =>
      Object.entries(paymentMethods).map(([method, v]) => ({
        label: method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: v.total,
      })),
    [paymentMethods]
  );

  const inventoryUtilization = a?.inventoryUtilization || { byStatus: {}, total: 0, utilizationPercent: 0 };
  const heatmapGrid = a?.customerActivityHeatmap || Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
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
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeInUp} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Reports &amp; Analytics</h1>
            <span className={`flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ${isFetching ? 'animate-pulse' : ''}`}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real platform-wide figures computed live from Order / Payment / User / Product records
            {selectedCity ? ` — scoped to ${selectedCity.name}` : ' — across all cities'}. Auto-refreshes every 20s.
          </p>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={fadeInUp}>
        <Card variant="glass" className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPreset(p.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  rangePreset === p.key && !customStart && !customEnd
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="mx-1 hidden text-xs text-slate-400 sm:inline">or zoom into a custom range:</span>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-auto" />
            <span className="text-xs text-slate-400">to</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
            <Select value={vendorFilter} onChange={setVendorFilter} options={vendorOptions} />
            <Select value={partnerFilter} onChange={setPartnerFilter} options={partnerOptions} />
            <Select value={customerFilter} onChange={setCustomerFilter} options={customerOptions} />
          </div>
        </Card>
      </motion.div>

      {/* Overview KPIs */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard icon={IndianRupee} label="Revenue" value={overview.totalRevenue} prefix="₹" accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
        <KPICard icon={ShoppingBag} label="Orders" value={overview.totalOrders} accent="bg-accent-500/10 text-accent-600 dark:text-accent-300" />
        <KPICard icon={CalendarClock} label="Active Rentals" value={overview.totalRentals} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <KPICard icon={PackageCheck} label="Completed Rentals" value={overview.completedRentals} accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
        <KPICard icon={XCircle} label="Cancelled Orders" value={overview.cancelledOrders} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
        <KPICard icon={Users} label="Customers" value={overview.totalCustomers} accent="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
        <KPICard icon={Building2} label="Vendors" value={overview.totalVendors} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <KPICard icon={Truck} label="Delivery Partners" value={overview.totalDeliveryPartners} accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
        <KPICard icon={Package} label="Active Products" value={overview.activeProducts} accent="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        <KPICard icon={Boxes} label="Inventory Value" value={overview.inventoryValue} prefix="₹" accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <KPICard icon={Wallet} label="Platform Profit" value={overview.profit} prefix="₹" accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <KPICard icon={Hourglass} label="Pending Orders" value={overview.pendingOrders} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
        <KPICard icon={Award} label="Vendor Growth" value={overview.vendorGrowth} suffix=" new" accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <KPICard icon={Gauge} label="Delivery Performance" value={overview.deliverySuccessRate} suffix="%" accent="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
        <KPICard icon={Star} label="Product Performance" value={overview.productPerformance} suffix=" ★" accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </motion.div>

      {/* Revenue / Orders / Rentals trend */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Revenue trend" subtitle="Paid revenue over the selected period" icon={TrendingUp}>
          <LineAreaChart data={revenueTrend.length ? revenueTrend : [{ label: '—', value: 0 }]} formatValue={money} hue="#6366f1" />
        </ChartCard>
        <ChartCard title="Monthly revenue" subtitle="Same data, bar view" icon={TrendingUp}>
          <WeeklyTrendChart weeks={revenueTrend.length ? revenueTrend : [{ label: '—', value: 0 }]} formatValue={money} />
        </ChartCard>
        <ChartCard title="Rentals trend" subtitle="New rentals started per month" icon={CalendarClock}>
          <LineAreaChart data={rentalsTrend.length ? rentalsTrend : [{ label: '—', value: 0 }]} hue="#14b8a6" />
        </ChartCard>
      </motion.div>

      {/* Weekly / Daily revenue + orders trend */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Weekly revenue" subtitle="Last 8 weeks, paid revenue" icon={TrendingUp}>
          <WeeklyTrendChart weeks={weeklyRevenue.length ? weeklyRevenue : [{ label: '—', value: 0 }]} formatValue={money} />
        </ChartCard>
        <ChartCard title="Daily revenue" subtitle="Last 30 days, paid revenue" icon={TrendingUp}>
          <LineAreaChart data={dailyRevenue.length ? dailyRevenue : [{ label: '—', value: 0 }]} formatValue={money} hue="#f59e0b" />
        </ChartCard>
        <ChartCard title="Orders trend" subtitle="Orders placed per month" icon={ShoppingBag}>
          <WeeklyTrendChart weeks={ordersTrendData.length ? ordersTrendData : [{ label: '—', value: 0 }]} />
        </ChartCard>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ChartCard title="Peak rental hours" subtitle="When customers place orders, by hour of day">
          <WeeklyTrendChart weeks={peakHours} />
        </ChartCard>
      </motion.div>

      {/* Customer activity heatmap */}
      <motion.div variants={fadeInUp}>
        <ChartCard title="Customer activity heatmap" subtitle="Order volume by day of week and hour of day" icon={Flame}>
          <ActivityHeatmap grid={heatmapGrid} />
        </ChartCard>
      </motion.div>

      {/* Order pipeline + category breakdown */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Order pipeline" subtitle="All order items grouped by fulfillment stage">
          <StatusBreakdownChart counts={groupedCounts} />
        </ChartCard>
        <ChartCard title="Revenue by category" subtitle="Rental revenue split by product category">
          {revenueByCategory.length > 0 ? (
            <PieDonutChart data={revenueByCategory} donut />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No category revenue yet.</p>
          )}
        </ChartCard>
      </motion.div>

      {/* Rental status distribution + products by category */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Rental status distribution" subtitle="Where every rental currently stands">
          {rentalStatusData.length > 0 ? (
            <PieDonutChart data={rentalStatusData} donut />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No rentals recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Products by category" subtitle="Catalog composition">
          {productCountByCategory.length > 0 ? (
            <MagnitudeBarChart data={productCountByCategory} valueSuffix=" products" />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No products yet.</p>
          )}
        </ChartCard>
      </motion.div>

      {/* Customer growth + Vendor growth */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Customer growth" subtitle="New customer signups per month" icon={Users}>
          <LineAreaChart data={customerGrowth.length ? customerGrowth : [{ label: '—', value: 0 }]} hue="#8b5cf6" />
        </ChartCard>
        <ChartCard title="Vendor growth" subtitle="New vendor signups per month" icon={Building2}>
          <LineAreaChart data={vendorGrowthTrend.length ? vendorGrowthTrend : [{ label: '—', value: 0 }]} hue="#0ea5e9" />
        </ChartCard>
      </motion.div>

      {/* Vendor performance */}
      <motion.div variants={fadeInUp}>
        <ChartCard title="Vendor performance ranking" subtitle="Top vendors by revenue, this period" icon={Building2}>
          {vendorPerformance.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No vendor revenue recorded yet.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <MagnitudeBarChart data={vendorBars} formatValue={money} />
              <Leaderboard
                items={vendorPerformance.map((v) => ({ key: v._id, label: v.businessName, orders: v.orders, rating: v.averageRating, value: v.revenue }))}
                renderMeta={(v) => `${v.orders} order${v.orders === 1 ? '' : 's'}${v.rating ? ` · ★ ${v.rating.toFixed(1)}` : ''}`}
                renderValue={(v) => money(v.value)}
              />
            </div>
          )}
        </ChartCard>
      </motion.div>

      {/* Delivery performance */}
      <motion.div variants={fadeInUp}>
        <ChartCard title="Delivery partner performance" subtitle="Top delivery partners by completed deliveries, this period" icon={Truck}>
          {deliveryPerformance.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No delivery activity recorded yet.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <MagnitudeBarChart data={deliveryBars} valueSuffix=" deliveries" />
              <Leaderboard
                items={deliveryPerformance.map((p) => ({ key: p._id, label: p.name || 'Partner', assigned: p.totalAssigned, rating: p.avgRating, value: p.completedDeliveries }))}
                renderMeta={(p) => `${p.assigned} assigned${p.rating ? ` · ★ ${p.rating.toFixed(1)}` : ''}`}
                renderValue={(p) => `${p.value} completed`}
              />
            </div>
          )}
        </ChartCard>
      </motion.div>

      {/* City comparison */}
      <motion.div variants={fadeInUp}>
        <ChartCard title="Revenue by city" subtitle="Revenue across every active city" icon={MapPin}>
          {cityRevenueBars.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No cities configured yet.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <MagnitudeBarChart data={cityRevenueBars} formatValue={money} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                      <th className="py-2 pr-2">City</th>
                      <th className="py-2 pr-2">Orders</th>
                      <th className="py-2 pr-2">Rentals</th>
                      <th className="py-2 pr-2">Vendors</th>
                      <th className="py-2 pr-2">Customers</th>
                      <th className="py-2">Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityComparison.map((c) => (
                      <tr key={c.cityId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                        <td className="py-2 pr-2 font-medium text-slate-700 dark:text-slate-200">{c.cityName}</td>
                        <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{c.orders}</td>
                        <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{c.rentals}</td>
                        <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{c.vendors}</td>
                        <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{c.customers}</td>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{c.products}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </ChartCard>
      </motion.div>

      {/* Orders by city + Rentals by city */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Orders by city" subtitle="Order volume across every active city" icon={ShoppingBag}>
          {cityOrdersBars.length > 0 ? <MagnitudeBarChart data={cityOrdersBars} valueSuffix=" orders" /> : <p className="text-sm text-slate-500 dark:text-slate-400">No orders yet.</p>}
        </ChartCard>
        <ChartCard title="Rentals by city" subtitle="Active rentals across every active city" icon={CalendarClock}>
          {cityRentalsBars.length > 0 ? <MagnitudeBarChart data={cityRentalsBars} valueSuffix=" rentals" /> : <p className="text-sm text-slate-500 dark:text-slate-400">No active rentals yet.</p>}
        </ChartCard>
      </motion.div>

      {/* Top selling vs top renting products */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top selling products" subtitle="Ranked by number of separate orders, this period" icon={Trophy}>
          {topSellingBars.length > 0 ? <MagnitudeBarChart data={topSellingBars} valueSuffix=" orders" /> : <p className="text-sm text-slate-500 dark:text-slate-400">No orders recorded yet.</p>}
        </ChartCard>
        <ChartCard title="Top renting products" subtitle="Ranked by units currently/ever rented, this period" icon={Star}>
          {topRentingBars.length > 0 ? <MagnitudeBarChart data={topRentingBars} valueSuffix=" units" /> : <p className="text-sm text-slate-500 dark:text-slate-400">No rentals recorded yet.</p>}
        </ChartCard>
      </motion.div>

      {/* Payment methods + inventory utilization */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Payment methods" subtitle="Paid revenue split by method" icon={Wallet}>
          {paymentMethodData.length > 0 ? (
            <PieDonutChart data={paymentMethodData} donut />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Inventory utilization" subtitle="Share of units currently reserved or out for rent" icon={Boxes}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
            <ProgressRing value={inventoryUtilization.utilizationPercent} label="Utilization" hue="#6366f1" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(inventoryUtilization.byStatus).map(([status, count]) => (
                <div key={status}>
                  <p className="font-semibold text-slate-900 dark:text-white">{count}</p>
                  <p className="text-xs capitalize text-slate-400">{status.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </motion.div>

      {/* Cancellation + return + delivery success rate */}
      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Cancellation rate" subtitle="Cancelled order items, this period" icon={Percent}>
          <div className="flex justify-center">
            <ProgressRing value={a?.cancellationRate || 0} hue="#f43f5e" />
          </div>
        </ChartCard>
        <ChartCard title="Return rate" subtitle="Delivered rentals that completed their return cycle" icon={RotateCcw}>
          <div className="flex justify-center">
            <ProgressRing value={a?.returnRate || 0} hue="#10b981" />
          </div>
        </ChartCard>
        <ChartCard title="Delivery success rate" subtitle="Assigned deliveries that completed vs. were cancelled" icon={Gauge}>
          <div className="flex justify-center">
            <ProgressRing value={a?.deliverySuccessRate || 0} hue="#0ea5e9" />
          </div>
        </ChartCard>
      </motion.div>

      <motion.p variants={fadeInUp} className="flex items-center gap-1.5 text-xs text-slate-400">
        <Sparkles size={12} /> Every figure above is computed live from real Order / Payment / User / Product / Vendor / DeliveryPartner records — nothing is static placeholder data.
      </motion.p>
    </motion.div>
  );
}
