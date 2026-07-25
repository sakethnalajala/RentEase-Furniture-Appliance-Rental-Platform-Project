'use client';

import { Sparkles, Flame, ThumbsUp, Sofa, Refrigerator, Clock3, Award, Percent, Tag, Gem, Wallet, Crown } from 'lucide-react';
import ProductRail from './ProductRail';
import { useListCategoriesQuery } from '@/store/customerApi';

// Every rail is a genuinely different, real backend query (sort/category/price-tier) —
// not the same list relabeled — so each "collection" actually differs, matching the
// Amazon/IKEA/Pepperfry-style curated homepage the Browse experience is meant to feel like.
export default function BrowseCollections({ cityId }) {
  const { data: categoriesData } = useListCategoriesQuery();
  const categories = categoriesData?.data || [];
  const furnitureId = categories.find((c) => c.slug === 'furniture')?._id;
  const applianceId = categories.find((c) => c.slug === 'appliances')?._id;

  const base = { city: cityId };

  return (
    <div className="space-y-10">
      <ProductRail
        title="Featured Products"
        subtitle="Hand-picked, top-rated picks across the catalog"
        icon={Sparkles}
        accent="from-brand-500 to-accent-500"
        params={{ ...base, sort: 'rating', minRating: 4 }}
        seeAllHref="/customer/browse?sort=rating"
      />
      <ProductRail
        title="Trending Products"
        subtitle="Most rented this month"
        icon={Flame}
        accent="from-rose-500 to-accent-500"
        params={{ ...base, sort: 'best_selling' }}
        seeAllHref="/customer/browse?sort=best_selling"
      />
      <ProductRail
        title="Recommended for You"
        subtitle="Popular picks other renters loved"
        icon={ThumbsUp}
        accent="from-brand-500 to-brand-400"
        params={{ ...base, sort: 'popular' }}
        seeAllHref="/customer/browse?sort=popular"
      />
      {furnitureId && (
        <ProductRail
          title="Popular Furniture"
          subtitle="Best-selling sofas, beds, tables and more"
          icon={Sofa}
          accent="from-amber-500 to-accent-500"
          params={{ ...base, category: furnitureId, sort: 'best_selling' }}
          seeAllHref={`/customer/browse?category=${furnitureId}&sort=best_selling`}
        />
      )}
      {applianceId && (
        <ProductRail
          title="Popular Appliances"
          subtitle="Best-selling fridges, washing machines and more"
          icon={Refrigerator}
          accent="from-sky-500 to-brand-500"
          params={{ ...base, category: applianceId, sort: 'best_selling' }}
          seeAllHref={`/customer/browse?category=${applianceId}&sort=best_selling`}
        />
      )}
      <ProductRail
        title="Recently Added"
        subtitle="Freshly listed inventory"
        icon={Clock3}
        accent="from-violet-500 to-brand-500"
        params={{ ...base, sort: 'newest' }}
        seeAllHref="/customer/browse?sort=newest"
      />
      <ProductRail
        title="Best Sellers"
        subtitle="Our most-rented products of all time"
        icon={Award}
        accent="from-emerald-500 to-brand-500"
        params={{ ...base, sort: 'best_selling', minRating: 4 }}
        seeAllHref="/customer/browse?sort=best_selling"
      />
      <ProductRail
        title="Special Offers"
        subtitle="Extra savings on select rentals"
        icon={Percent}
        accent="from-rose-500 to-rose-400"
        params={{ ...base, sort: 'discount', minDiscount: 10 }}
        seeAllHref="/customer/browse?sort=discount"
      />
      <ProductRail
        title="Today's Deals"
        subtitle="Our steepest discounts, updated daily"
        icon={Tag}
        accent="from-orange-500 to-rose-500"
        params={{ ...base, sort: 'discount', minDiscount: 20 }}
        seeAllHref="/customer/browse?sort=discount"
      />
      <ProductRail
        title="Premium Collection"
        subtitle="Top-rated, higher-tier products"
        icon={Gem}
        accent="from-violet-500 to-accent-500"
        params={{ ...base, sort: 'rating', minPrice: 2000 }}
        seeAllHref="/customer/browse?sort=rating"
      />
      <ProductRail
        title="Luxury Collection"
        subtitle="Our highest-value rentals"
        icon={Crown}
        accent="from-amber-500 to-brand-600"
        params={{ ...base, sort: 'price_desc', minPrice: 3000 }}
        seeAllHref="/customer/browse?sort=price_desc"
      />
      <ProductRail
        title="Budget Collection"
        subtitle="Great rentals under ₹1,500/mo"
        icon={Wallet}
        accent="from-emerald-500 to-emerald-400"
        params={{ ...base, sort: 'price_asc', maxPrice: 1500 }}
        seeAllHref="/customer/browse?sort=price_asc"
      />
    </div>
  );
}
