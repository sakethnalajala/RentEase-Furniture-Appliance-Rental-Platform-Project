'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Star, ImageOff, MessageSquare } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMockRentals } from '@/hooks/useMockRentals';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="focus-ring rounded p-0.5">
          <Star size={20} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/20'} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { isLoading, rentalHistory } = useMockRentals();
  const [myReviews, setMyReviews] = useLocalStorage('rentease_my_reviews', {});
  const [drafts, setDrafts] = useState({});

  const reviewable = rentalHistory.filter((r) => r.status === 'completed' || r.status === 'extended');

  const updateDraft = (productId, field, value) =>
    setDrafts((d) => ({ ...d, [productId]: { ...(d[productId] || { rating: 0, comment: '' }), [field]: value } }));

  const submitReview = (productId) => {
    const draft = drafts[productId];
    if (!draft?.rating) {
      toast.error('Pick a star rating first.');
      return;
    }
    setMyReviews((prev) => ({ ...prev, [productId]: { ...draft, createdAt: new Date().toISOString() } }));
    toast.success('Review submitted. Thank you!');
  };

  return (
    <div className="space-y-6">
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Rentals
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Reviews & Ratings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rate products from your completed rentals.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : reviewable.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-2 p-12 text-center">
          <MessageSquare size={28} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Complete a rental to leave a review.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviewable.map((rental) => {
            const existing = myReviews[rental.product._id];
            const draft = drafts[rental.product._id] || { rating: existing?.rating || 0, comment: existing?.comment || '' };

            return (
              <Card key={rental.product._id} variant="glass" className="flex flex-col gap-3 p-4 sm:flex-row">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  {rental.product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rental.product.images[0]} alt={rental.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                      <ImageOff size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{rental.product.name}</p>
                  {existing ? (
                    <div className="mt-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={15} className={i < existing.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/20'} />
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{existing.comment}</p>
                      <p className="mt-1 text-xs text-slate-400">Submitted {new Date(existing.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <StarPicker value={draft.rating} onChange={(v) => updateDraft(rental.product._id, 'rating', v)} />
                      <textarea
                        rows={2}
                        value={draft.comment}
                        onChange={(e) => updateDraft(rental.product._id, 'comment', e.target.value)}
                        placeholder="Share your experience…"
                        className="focus-ring w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <Button size="sm" onClick={() => submitReview(rental.product._id)}>
                        Submit review
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
