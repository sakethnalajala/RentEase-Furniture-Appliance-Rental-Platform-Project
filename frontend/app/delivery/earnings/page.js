'use client';

import { IndianRupee, CalendarDays, CalendarRange, Wallet, Gift, Award, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { CountUpNumber, WeeklyTrendChart } from '@/components/vendor/AnalyticsCharts';
import { useGetDeliveryEarningsQuery } from '@/store/deliveryApi';
import { money } from '@/lib/deliveryHelpers';

function KPICard({ icon: Icon, label, value, accent }) {
  return (
    <Card variant="glass" hover className="p-5 transition-shadow duration-300 hover:shadow-glow">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
        <CountUpNumber value={value} prefix="₹" />
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

export default function DeliveryEarningsPage() {
  const { data, isLoading } = useGetDeliveryEarningsQuery();
  const earnings = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Earnings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your delivery fee payouts across every completed delivery.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={CalendarDays} label="Today" value={earnings?.daily || 0} accent="bg-brand-500/10 text-brand-600 dark:text-brand-300" />
        <KPICard icon={CalendarRange} label="This week" value={earnings?.weekly || 0} accent="bg-accent-500/10 text-accent-600 dark:text-accent-300" />
        <KPICard icon={CalendarRange} label="This month" value={earnings?.monthly || 0} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <KPICard icon={Wallet} label="All time" value={earnings?.allTime || 0} accent="bg-violet-500/10 text-violet-600 dark:text-violet-300" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Gift size={18} />
          </span>
          <div>
            <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{money(earnings?.incentive)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Performance incentive (5% of all-time fees)</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Award size={18} />
          </span>
          <div>
            <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{money(earnings?.bonus)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Volume bonus (10+ / 20+ lifetime deliveries)</p>
          </div>
        </Card>
      </div>

      <Card variant="glass" className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500/20 to-accent-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-premium">
            <IndianRupee size={20} />
          </span>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total payout (fees + incentive + bonus)</p>
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white">{money(earnings?.totalPayout)}</p>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Last 7 days</h2>
          <Badge variant="neutral" className="flex items-center gap-1.5">
            <Info size={12} /> Delivery fee only
          </Badge>
        </div>
        <div className="mt-5">
          <WeeklyTrendChart weeks={earnings?.dailyTrend || []} formatValue={money} />
        </div>
      </Card>
    </div>
  );
}
