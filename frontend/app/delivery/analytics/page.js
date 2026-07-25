'use client';

import Link from 'next/link';
import { Truck, CheckCircle2, XCircle, Clock, Star, Activity, Wallet, ArrowUpRight, Gauge } from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useGetDeliveryStatsQuery, useGetDeliveryEarningsQuery } from '@/store/deliveryApi';
import { money } from '@/lib/deliveryHelpers';
import { ProgressRing, CountUpNumber, WeeklyTrendChart, LineAreaChart } from '@/components/vendor/AnalyticsCharts';

function KPICard({ icon: Icon, label, value, suffix = '', decimals = 0, accent }) {
  return (
    <Card variant="glass" hover className="p-5 transition-shadow duration-300 hover:shadow-glow">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
        <CountUpNumber value={value} suffix={suffix} decimals={decimals} />
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

export default function DeliveryAnalyticsPage() {
  const { data, isLoading } = useGetDeliveryStatsQuery();
  const { data: earningsData, isLoading: earningsLoading } = useGetDeliveryEarningsQuery();
  const stats = data?.data;
  const earnings = earningsData?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your delivery performance, at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={Truck} label="Total deliveries" value={stats?.totalDeliveries || 0} accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
        <KPICard icon={CheckCircle2} label="Completed" value={stats?.completedCount || 0} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <KPICard icon={XCircle} label="Cancelled" value={stats?.cancelledCount || 0} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
        <KPICard icon={Activity} label="Currently active" value={stats?.activeCount || 0} accent="bg-accent-500/10 text-accent-600 dark:text-accent-300" />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card variant="glass" className="p-5">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Completion rate</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Delivered vs. total assigned</p>
          <div className="mt-4 flex justify-center">
            <ProgressRing value={stats?.completionRate || 0} label="Completed" hue="#10b981" />
          </div>
        </Card>

        <Card variant="glass" className="p-5">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Delivery performance</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Blends rating, completion &amp; speed</p>
          <div className="mt-4 flex justify-center">
            <ProgressRing value={stats?.performanceScore || 0} label="Score" hue="#6366f1" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Weekly delivery volume</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deliveries completed per week, last 8 weeks</p>
            </div>
          </div>
          <div className="mt-5">
            <WeeklyTrendChart weeks={stats?.weeklyTrend || []} />
          </div>
        </Card>
      </div>

      <Card variant="glass" className="p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Monthly delivery trend</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deliveries completed per month, last 6 months</p>
        </div>
        <div className="mt-5">
          <LineAreaChart data={stats?.monthlyTrend || []} hue="#f97316" />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Clock size={18} />
          </span>
          <div>
            <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
              <CountUpNumber value={stats?.avgDeliveryMinutes || 0} suffix=" min" />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average delivery time (pickup → drop-off)</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Star size={18} />
          </span>
          <div>
            <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{(stats?.averageRating || 0).toFixed(1)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average customer rating</p>
          </div>
        </Card>
      </div>

      <Card variant="glass" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Earnings summary</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Delivery fee payouts for this city&apos;s account</p>
          </div>
          <Link href="/delivery/earnings" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
            Full breakdown <ArrowUpRight size={12} />
          </Link>
        </div>
        {earningsLoading ? (
          <Skeleton className="mt-4 h-20 rounded-xl" />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 dark:border-white/10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet size={16} />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{money(earnings?.monthly)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">This month</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 dark:border-white/10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                <Gauge size={16} />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{money(earnings?.allTime)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">All time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3.5 dark:border-white/10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Wallet size={16} />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{money(earnings?.totalPayout)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total payout</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
