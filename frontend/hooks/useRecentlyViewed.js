'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const MAX_ITEMS = 8;

// Real, genuinely-persisted browsing history (not mock) — tracked client-side since there's
// no server-side "recently viewed" endpoint (and it's arguably better as a per-device
// preference anyway).
export function useRecentlyViewed() {
  const [ids, setIds] = useLocalStorage('rentease_recently_viewed', []);

  const recordView = useCallback(
    (productId) => {
      setIds((prev) => [productId, ...(prev || []).filter((id) => id !== productId)].slice(0, MAX_ITEMS));
    },
    [setIds]
  );

  return { recentlyViewedIds: ids || [], recordView };
}
