'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Star,
  Heart,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Wrench,
  ImageOff,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  QrCode,
  Barcode as BarcodeIcon,
  Ruler,
  Weight,
  Calendar,
  Palette,
  Share2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ProductCard from '@/components/customer/ProductCard';
import { useGetProductQuery, useAddToCartMutation } from '@/store/customerApi';
import { setCheckoutDraft } from '@/store/checkoutSlice';
import { useWishlistToggle } from '@/hooks/useWishlistToggle';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { buildProductReviews } from '@/lib/mockRentalData';

function ZoomableImage({ src, alt }) {
  const [zoomStyle, setZoomStyle] = useState({});

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({ transformOrigin: `${x}% ${y}%`, transform: 'scale(1.9)' });
  };

  return (
    <div
      className="relative h-full w-full cursor-zoom-in overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setZoomStyle({})}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-200 ease-out" style={zoomStyle} />
    </div>
  );
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data, isLoading, error } = useGetProductQuery(productId);
  const { wishlistIds, toggle, isLoading: wishlistToggling } = useWishlistToggle();
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const { recordView } = useRecentlyViewed();

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = { title: product?.name, text: `Check out ${product?.name} on RentEase`, url };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not share this product.');
    }
  };

  const product = data?.data?.product;
  const reviews = useMemo(() => buildProductReviews(product), [product]);

  useEffect(() => {
    if (productId) recordView(productId);
  }, [productId, recordView]);

  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <Card variant="glass" className="p-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">This product isn’t available anymore.</p>
        <Link href="/customer/browse" className="mt-4 inline-block text-sm font-medium text-brand-600 dark:text-brand-400">
          Back to Browse
        </Link>
      </Card>
    );
  }

  const { rentalPlans, inventory, relatedProducts } = data.data;
  const vendorName = product.isRentEaseOwned ? 'RentEase' : product.vendor?.businessName || 'Vendor';
  const inStock = product.stock > 0 && product.availabilityStatus === 'active';
  const activePlan = rentalPlans.find((p) => p._id === selectedPlanId) || rentalPlans[0];
  const discountedMonthly = activePlan
    ? Math.round(product.monthlyRentalPrice * (1 - activePlan.discountPercent / 100))
    : product.monthlyRentalPrice;

  const handleAddToCart = async () => {
    if (!activePlan) return;
    try {
      await addToCart({ productId: product._id, rentalPlanId: activePlan._id, quantity }).unwrap();
      toast.success('Added to cart.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not add to cart.');
    }
  };

  // Rent Now skips the cart entirely — builds a single-item checkout draft straight from this
  // page's own state (plan/quantity/product) and hands off to Checkout directly.
  const handleRentNow = () => {
    if (!activePlan) return;
    const draft = [
      {
        cartItemId: null,
        productId: product._id,
        name: product.name,
        image: product.images?.[0] || null,
        subCategory: product.subCategory,
        brand: product.brand,
        city: product.city ? { id: product.city._id, name: product.city.name } : null,
        rentalPlanId: activePlan._id,
        rentalPlanLabel: activePlan.label,
        discountPercent: activePlan.discountPercent || 0,
        unitMonthlyRentalPrice: product.monthlyRentalPrice,
        monthlyRentalPrice: discountedMonthly,
        securityDeposit: product.securityDeposit,
        deliveryCharge: product.deliveryCharge || 0,
        installationRequired: product.installationRequired || false,
        estimatedDeliveryDays: product.estimatedDeliveryDays,
        quantity,
      },
    ];
    dispatch(setCheckoutDraft(draft));
    router.push('/customer/checkout');
  };

  return (
    <div className="space-y-6">
      <Link href="/customer/browse" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Browse
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <ZoomableImage src={product.images?.[activeImage] || product.images?.[0]} alt={product.name} />
            <div className="absolute right-4 top-4 flex gap-2">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share this product"
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm backdrop-blur dark:bg-slate-900/80 dark:text-slate-200"
              >
                <Share2 size={17} />
              </button>
              <button
                type="button"
                onClick={() => toggle(product)}
                disabled={wishlistToggling}
                aria-label="Toggle wishlist"
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm backdrop-blur dark:bg-slate-900/80 dark:text-slate-200"
              >
                <Heart size={18} className={wishlistIds.has(product._id) ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            </div>
          </div>

          {product.images?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                    activeImage === i ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <div>
          <div className="flex items-center gap-2">
            <Badge variant="brand">{product.subCategory}</Badge>
            {!inStock && <Badge variant="neutral">Unavailable</Badge>}
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>{product.brand}</span>
            <span className="flex items-center gap-1 text-amber-500">
              <Star size={14} className="fill-amber-400 text-amber-400" /> {product.averageRating?.toFixed(1)}{' '}
              <span className="text-slate-400">({product.numReviews} reviews)</span>
            </span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white">
              ₹{discountedMonthly.toLocaleString('en-IN')}
              <span className="text-base font-normal text-slate-500 dark:text-slate-400">/mo</span>
            </p>
            {activePlan?.discountPercent > 0 && (
              <span className="mb-1 text-sm text-slate-400 line-through">₹{product.monthlyRentalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ₹{product.securityDeposit.toLocaleString('en-IN')} refundable security deposit
          </p>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Choose a rental plan</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {rentalPlans.map((plan) => (
                <button
                  key={plan._id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan._id)}
                  className={`rounded-xl border px-3 py-2.5 text-center transition-colors ${
                    activePlan?._id === plan._id
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-400/10'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.label}</p>
                  {plan.discountPercent > 0 ? (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Save {plan.discountPercent}%</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Standard</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Quantity</p>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-1.5 py-1 dark:border-white/10">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="secondary" loading={isAdding} disabled={!inStock} onClick={handleAddToCart}>
              <ShoppingCart size={16} /> Add to Cart
            </Button>
            <Button disabled={!inStock} onClick={handleRentNow}>
              <Zap size={16} /> Rent Now
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-200/70 pt-6 text-sm dark:border-white/10 sm:grid-cols-4">
            <InfoItem icon={Truck} label="Delivery" value={`${product.estimatedDeliveryDays} day(s)`} />
            <InfoItem icon={ShieldCheck} label="Condition" value={product.condition.replace('_', ' ')} />
            <InfoItem icon={Wrench} label="Installation" value={product.installationRequired ? 'Required' : 'Not needed'} />
            <InfoItem icon={Star} label="Sold by" value={vendorName} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="glass" className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Description</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Specifications
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <DetailRow icon={Palette} label="Color" value={product.color} />
            <DetailRow icon={Ruler} label="Dimensions" value={product.dimensions?.length ? `${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height} ${product.dimensions.unit}` : '—'} />
            <DetailRow icon={Weight} label="Weight" value={product.weight?.value ? `${product.weight.value} ${product.weight.unit}` : '—'} />
            <DetailRow icon={Calendar} label="Purchase year" value={product.purchaseYear} />
            <DetailRow label="Min. rental" value={`${product.minRentalPeriodMonths} mo`} />
            <DetailRow label="Max. rental" value={`${product.maxRentalPeriodMonths} mo`} />
            <DetailRow label="Delivery charge" value={product.deliveryCharge > 0 ? `₹${product.deliveryCharge}` : 'Free'} />
            <DetailRow label="City" value={product.city?.name} />
            <DetailRow label="SKU" value={product.sku} />
          </dl>
        </Card>

        <Card variant="glass" className="p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Unit details</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The specific serialized unit reserved for your rental.</p>
          {inventory ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{inventory.serialNumber}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inventory.qrCodeUrl} alt="QR code" className="mx-auto h-20 w-20" />
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                    <QrCode size={11} /> QR Code
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-2 text-center dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inventory.barcodeUrl} alt="Barcode" className="mx-auto h-20 w-full object-contain" />
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                    <BarcodeIcon size={11} /> Barcode
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No inventory unit on file.</p>
          )}
        </Card>
      </div>

      <Card variant="glass" className="p-6">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Reviews</h2>
        <div className="mt-4 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-slate-200/70 pb-4 last:border-0 last:pb-0 dark:border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.name}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/20'} />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{r.comment}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          ))}
        </div>
      </Card>

      {relatedProducts?.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">Related products</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} isWishlisted={wishlistIds.has(p._id)} onToggleWishlist={toggle} wishlistLoading={wishlistToggling} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="font-medium capitalize text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-1.5">
      {Icon && <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />}
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="font-medium text-slate-700 dark:text-slate-200">{value}</dd>
      </div>
    </div>
  );
}
