'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Truck, PackageSearch, CheckCircle2, IndianRupee, Star, ArrowUpRight, ImageOff, Clock, Zap,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import OrderStatusBadge from '@/components/vendor/OrderStatusBadge';
import { ProgressRing, CountUpNumber } from '@/components/vendor/AnalyticsCharts';
import {
  useGetMyDeliveryProfileQuery,
  useUpdateAvailabilityMutation,
  useListDeliveryRequestsQuery,
  useListAssignedDeliveriesQuery,
  useListDeliveryHistoryQuery,
  useGetDeliveryEarningsQuery,
  useGetDeliveryStatsQuery,
} from '@/store/deliveryApi';
import { statusLabel, isToday, money } from '@/lib/deliveryHelpers';
import { LIVE_POLL_MS } from '@/lib/livePoll';

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card variant="glass" hover className="p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

export default function DeliveryDashboardPage() {
  const { data: profileData, isLoading: profileLoading } = useGetMyDeliveryProfileQuery();
  const [updateAvailability, { isLoading: isTogglingAvailability }] = useUpdateAvailabilityMutation();
  const { data: requestsData, isLoading: requestsLoading } = useListDeliveryRequestsQuery(undefined, { pollingInterval: LIVE_POLL_MS });
  const { data: assignedData, isLoading: assignedLoading } = useListAssignedDeliveriesQuery();
  const { data: historyData } = useListDeliveryHistoryQuery();
  const { data: earningsData, isLoading: earningsLoading } = useGetDeliveryEarningsQuery();
  const { data: statsData, isLoading: statsLoading } = useGetDeliveryStatsQuery();

  const partner = profileData?.data;
  const requests = requestsData?.data || [];
  const assigned = assignedData?.data || [];
  const history = historyData?.data || [];
  const earnings = earningsData?.data;
  const stats = statsData?.data;

  // "Today's Deliveries" isn't a single field the backend exposes — this app's established
  // pattern (see frontend/lib/mockVendorData.js) is to derive dashboard metrics from the real
  // data already on hand and document the choice. Here: items this partner picked up today
  // (still in progress) plus items delivered today (now in history) — i.e. everything this
  // partner touched today, not just a static "currently assigned" count.
  const todaysDeliveries = useMemo(() => {
    const pickedUpToday = assigned.filter((i) => isToday(i.pickedUpAt)).length;
    const deliveredToday = history.filter((i) => isToday(i.deliveredAt)).length;
    return pickedUpToday + deliveredToday;
  }, [assigned, history]);

  const recentAssigned = useMemo(() => assigned.slice(0, 5), [assigned]);
  const openRequests = useMemo(() => requests.slice(0, 5), [requests]);

  const loading = profileLoading || requestsLoading || assignedLoading || earningsLoading || statsLoading;

  const handleAvailabilityToggle = async (checked) => {
    try {
      await updateAvailability({ isAvailable: checked }).unwrap();
      toast.success(checked ? "You're now online — new requests will reach you." : "You're now offline.");
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update availability.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back{partner?.user?.name ? `, ${partner.user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here&apos;s your delivery activity today.</p>
        </div>
      </div>

      <Card variant="glass" className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-premium ${
              partner?.isAvailable
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-400 text-white'
                : 'bg-slate-300 text-slate-600 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            <Zap size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {partner?.isAvailable ? 'You are online' : 'You are offline'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {partner?.isAvailable ? 'Visible for new delivery requests in your city.' : 'Go online to start receiving delivery requests.'}
            </p>
          </div>
        </div>
        {!profileLoading && (
          <Switch checked={Boolean(partner?.isAvailable)} onChange={handleAvailabilityToggle} disabled={isTogglingAvailability} />
        )}
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={Truck}
            label="Today's deliveries"
            value={todaysDeliveries}
            accent="bg-brand-500/10 text-brand-600 dark:text-brand-300"
          />
          <StatCard
            icon={PackageSearch}
            label="Pending requests"
            value={requests.length}
            sub={requests.length > 0 ? 'Waiting to be accepted' : undefined}
            accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed deliveries"
            value={stats?.completedCount || 0}
            accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={IndianRupee}
            label="Today's earnings"
            value={money(earnings?.daily)}
            accent="bg-accent-500/10 text-accent-600 dark:text-accent-300"
          />
          <StatCard
            icon={Star}
            label="Delivery rating"
            value={partner?.averageRating?.toFixed(1) || '0.0'}
            accent="bg-violet-500/10 text-violet-600 dark:text-violet-300"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="glass" className="p-5">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Completion rate</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Delivered vs. total assigned</p>
          <div className="mt-4 flex justify-center">
            <ProgressRing value={stats?.completionRate || 0} label="Completed" hue="#10b981" />
          </div>
        </Card>
        <Card variant="glass" className="p-5">
          <div className="flex h-full flex-col justify-center gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                <Clock size={18} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  <CountUpNumber value={stats?.avgDeliveryMinutes || 0} suffix=" min" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Average delivery time (pickup → drop-off)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Truck size={18} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  <CountUpNumber value={stats?.totalDeliveries || 0} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Lifetime deliveries completed</p>
              </div>
            </div>
          </div>
        </Card>
        <Card variant="glass" className="flex flex-col justify-between p-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Earnings snapshot</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This week vs. all time</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">This week</span>
                <span className="font-semibold text-slate-900 dark:text-white">{money(earnings?.weekly)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">All time</span>
                <span className="font-semibold text-slate-900 dark:text-white">{money(earnings?.allTime)}</span>
              </div>
            </div>
          </div>
          <Link
            href="/delivery/earnings"
            className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-premium hover:shadow-glow"
          >
            View full earnings <ArrowUpRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="glass" className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Assigned deliveries</h2>
            <Link href="/delivery/assigned" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {recentAssigned.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <Truck size={28} className="text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Nothing assigned right now.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {recentAssigned.map((item) => (
                <div key={item._id} className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-white/10">
                  {item.product?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0]} alt={item.product.name} loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.product?.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {item.order?.customer?.name} · {item.order?.orderNumber}
                    </p>
                  </div>
                  <OrderStatusBadge status={statusLabel(item.status)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Open delivery requests</h2>
            <Link href="/delivery/requests" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {openRequests.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <PackageSearch size={28} className="text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No open requests in your city right now.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {openRequests.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.product?.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.vendor?.businessName}</p>
                  </div>
                  <Badge variant="brand" className="shrink-0">New</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
