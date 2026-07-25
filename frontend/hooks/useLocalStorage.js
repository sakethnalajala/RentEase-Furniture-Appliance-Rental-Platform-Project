'use client';

import { useEffect, useState } from 'react';

// Generic localStorage-backed state — genuinely persists across reloads (this is real
// client-side persistence, not a fake toggle), used for preferences that don't need a
// backend (notification settings, language, recently-viewed products, etc.).
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}
