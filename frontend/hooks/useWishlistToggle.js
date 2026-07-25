import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useGetWishlistQuery, useAddToWishlistMutation, useRemoveFromWishlistMutation } from '@/store/customerApi';

// Shared wishlist-toggle logic for any page rendering ProductCard grids (Dashboard, Browse,
// Wishlist itself) — keeps the "is this product wishlisted" set and the add/remove mutations
// in one place instead of duplicating per page. `wishlistIds`/`toggle` are memoized so they
// keep the same reference across re-renders whenever the underlying wishlist hasn't actually
// changed — otherwise every ProductCard in a 40+ item grid would re-render on every keystroke
// in the Browse search box, since a brand-new Set/function each render defeats React.memo.
export function useWishlistToggle() {
  const { data: wishlist } = useGetWishlistQuery();
  const [addToWishlist, { isLoading: isAdding }] = useAddToWishlistMutation();
  const [removeFromWishlist, { isLoading: isRemoving }] = useRemoveFromWishlistMutation();

  const wishlistIds = useMemo(() => new Set((wishlist?.data || []).map((p) => p._id)), [wishlist]);

  const toggle = useCallback(
    async (product) => {
      try {
        if (wishlistIds.has(product._id)) {
          await removeFromWishlist(product._id).unwrap();
          toast.success('Removed from wishlist.');
        } else {
          await addToWishlist(product._id).unwrap();
          toast.success('Added to wishlist.');
        }
      } catch {
        toast.error('Something went wrong. Please try again.');
      }
    },
    [wishlistIds, addToWishlist, removeFromWishlist]
  );

  return { wishlistIds, toggle, isLoading: isAdding || isRemoving };
}
