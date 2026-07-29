'use client';

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocalStorage } from './useLocalStorage';

const MAX_ITEMS = 8;

// Real, genuinely-persisted browsing history (not mock) — tracked client-side since there's
// no server-side "recently viewed" endpoint (and it's arguably better as a per-device
// preference anyway). Keyed per logged-in customer (falling back to a shared "guest" bucket
// when signed out) — a single un-scoped key would leak one customer's browsing history into
// another customer's dashboard the moment a second account logs in on the same browser.
export function useRecentlyViewed() {
  const userId = useSelector((state) => state.auth.user?.id);
  const [ids, setIds] = useLocalStorage(`rentease_recently_viewed_${userId || 'guest'}`, []);

  const recordView = useCallback(
    (productId) => {
      setIds((prev) => [productId, ...(prev || []).filter((id) => id !== productId)].slice(0, MAX_ITEMS));
    },
    [setIds]
  );

  return { recentlyViewedIds: ids || [], recordView };
}
