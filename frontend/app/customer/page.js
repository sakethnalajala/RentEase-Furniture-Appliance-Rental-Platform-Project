'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Sofa,
  Refrigerator,
  Heart,
  ShoppingCart,
  Package,
  ArrowRight,
  Sparkles,
  Flame,
  TrendingUp,
  ImageOff,
  Truck,
  CalendarClock,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import ProductCard from '@/components/customer/ProductCard';
import RecentlyViewedCard from '@/components/customer/RecentlyViewedCard';
import RentalStatusBadge from '@/components/customer/RentalStatusBadge';
import {
  useListCategoriesQuery,
  useListProductsQuery,
  useGetCartQuery,
  useGetWishlistQuery,
} from '@/store/customerApi';
import { useWishlistToggle } from '@/hooks/useWishlistToggle';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useMockRentals } from '@/hooks/useMockRentals';
import { fadeInUp, staggerContainer } from '@/lib/motion';

const CATEGORY_VISUALS = {
  furniture: { icon: Sofa, gradient: 'from-brand-500 to-brand-700' },
  appliances: { icon: Refrigerator, gradient: 'from-accent-500 to-rose-500' },
};

function ProductRow({ title, icon: Icon, products, isLoading, wishlistIds, toggle, wishlistToggling }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Icon size={15} className="text-brand-500" /> {title}
        </h2>
        <Link href="/customer/browse" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              isWishlisted={wishlistIds.has(product._id)}
              onToggleWishlist={toggle}
              wishlistLoading={wishlistToggling}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerDashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const selectedCity = useSelector((state) => state.city.selectedCity);

  const { data: categoriesData } = useListCategoriesQuery();
  const { data: cart } = useGetCartQuery();
  const { data: wishlist } = useGetWishlistQuery();
  const { recentlyViewedIds } = useRecentlyViewed();
  const { rentalHistory, isLoading: loadingRentals } = useMockRentals();
  const { wishlistIds, toggle, isLoading: wishlistToggling } = useWishlistToggle();

  const cityFilter = selectedCity?.id;
  const { data: featuredData, isLoading: loadingFeatured } = useListProductsQuery({ city: cityFilter, sort: 'rating', limit: 4 });
  const { data: trendingData, isLoading: loadingTrending } = useListProductsQuery({ city: cityFilter, sort: 'newest', limit: 4 });
  const { data: popularData, isLoading: loadingPopular } = useListProductsQuery({ city: cityFilter, sort: 'popular', limit: 4 });
  const { data: furnitureData, isLoading: loadingFurniture } = useListProductsQuery({
    city: cityFilter,
    category: categoriesData?.data?.find((c) => c.slug === 'furniture')?._id,
    sort: 'rating',
    limit: 4,
  });
  const { data: applianceData, isLoading: loadingAppliances } = useListProductsQuery({
    city: cityFilter,
    category: categoriesData?.data?.find((c) => c.slug === 'appliances')?._id,
    sort: 'rating',
    limit: 4,
  });

  const categories = categoriesData?.data || [];
  const cartItems = cart?.data?.items || [];
  const wishlistItems = wishlist?.data || [];
  const activeRentals = rentalHistory.filter((r) => r.status === 'active');
  const nextDelivery = activeRentals[0];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-10">
      <motion.div variants={fadeInUp}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {selectedCity ? `Browsing inventory in ${selectedCity.name}.` : 'Pick a city above to browse local inventory.'}
        </p>
      </motion.div>

      {/* Wishlist / Cart previews + rental summary */}
      <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-3">
        <Link href="/customer/wishlist">
          <Card variant="glass" hover className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <Heart size={18} />
              </span>
              <Badge variant="brand">{wishlistItems.length}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Wishlist</p>
            <div className="mt-2 flex -space-x-2">
              {wishlistItems.slice(0, 4).map((p) => (
                <div key={p._id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-white dark:border-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <ImageOff size={12} />}
                </div>
              ))}
              {wishlistItems.length === 0 && <p className="text-xs text-slate-400">Nothing saved yet</p>}
            </div>
          </Card>
        </Link>

        <Link href="/customer/cart">
          <Card variant="glass" hover className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                <ShoppingCart size={18} />
              </span>
              <Badge variant="brand">{cartItems.length}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Cart</p>
            <div className="mt-2 flex -space-x-2">
              {cartItems.slice(0, 4).map((item) => (
                <div key={item._id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-white dark:border-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.product?.images?.[0] ? <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" /> : <ImageOff size={12} />}
                </div>
              ))}
              {cartItems.length === 0 && <p className="text-xs text-slate-400">Your cart is empty</p>}
            </div>
          </Card>
        </Link>

        <Link href="/customer/rentals">
          <Card variant="glass" hover className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Package size={18} />
              </span>
              <Badge variant="success">{activeRentals.length}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Active rentals</p>
            {loadingRentals ? (
              <Skeleton className="mt-2 h-4 w-24 rounded" />
            ) : nextDelivery ? (
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Truck size={12} /> Next: {nextDelivery.product.name.slice(0, 22)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No active rentals</p>
            )}
          </Card>
        </Link>
      </motion.div>

      {/* Order tracking / upcoming delivery strip */}
      {nextDelivery && (
        <motion.div variants={fadeInUp}>
          <Card variant="glass" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-premium">
                <CalendarClock size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Upcoming: {nextDelivery.product.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rental ends {new Date(nextDelivery.rentalEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · <RentalStatusBadge status={nextDelivery.status} />
                </p>
              </div>
            </div>
            <Link href="/customer/rentals/current" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              View all current rentals
            </Link>
          </Card>
        </motion.div>
      )}

      {/* Recently viewed */}
      {recentlyViewedIds.length > 0 && (
        <motion.div variants={fadeInUp}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recently viewed</h2>
            <Link href="/customer/browse" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              Continue browsing
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyViewedIds.map((id) => (
              <RecentlyViewedCard key={id} productId={id} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Latest offers banner */}
      <motion.div variants={fadeInUp}>
        <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 p-6 text-white shadow-glow">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-blob rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Sparkles size={22} />
              <div>
                <p className="font-display text-lg font-bold">Latest offer: Save 20% on 12-month plans</p>
                <p className="text-sm text-white/85">Switch any rental to an annual plan and lock in the biggest discount.</p>
              </div>
            </div>
            <Link href="/customer/browse" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-lg">
              Shop now
            </Link>
          </div>
        </Card>
      </motion.div>

      {/* Shop by category */}
      <motion.div variants={fadeInUp}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Shop by category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => {
            const visual = CATEGORY_VISUALS[cat.slug] || CATEGORY_VISUALS.furniture;
            return (
              <Link key={cat._id} href={`/customer/browse?category=${cat._id}`}>
                <Card className={`relative overflow-hidden bg-gradient-to-br p-6 text-white shadow-premium ${visual.gradient}`}>
                  <visual.icon size={28} className="opacity-90" />
                  <p className="mt-4 font-display text-xl font-bold">{cat.name}</p>
                  <p className="mt-1 text-sm text-white/80">{cat.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                    Browse now <ArrowRight size={14} />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ProductRow
          title="Featured products"
          icon={Sparkles}
          products={featuredData?.data?.items || []}
          isLoading={loadingFeatured}
          wishlistIds={wishlistIds}
          toggle={toggle}
          wishlistToggling={wishlistToggling}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ProductRow
          title="Trending now"
          icon={TrendingUp}
          products={trendingData?.data?.items || []}
          isLoading={loadingTrending}
          wishlistIds={wishlistIds}
          toggle={toggle}
          wishlistToggling={wishlistToggling}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ProductRow
          title="Popular with renters"
          icon={Flame}
          products={popularData?.data?.items || []}
          isLoading={loadingPopular}
          wishlistIds={wishlistIds}
          toggle={toggle}
          wishlistToggling={wishlistToggling}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ProductRow
          title="Recommended furniture"
          icon={Sofa}
          products={furnitureData?.data?.items || []}
          isLoading={loadingFurniture}
          wishlistIds={wishlistIds}
          toggle={toggle}
          wishlistToggling={wishlistToggling}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ProductRow
          title="Recommended appliances"
          icon={Refrigerator}
          products={applianceData?.data?.items || []}
          isLoading={loadingAppliances}
          wishlistIds={wishlistIds}
          toggle={toggle}
          wishlistToggling={wishlistToggling}
        />
      </motion.div>
    </motion.div>
  );
}
