'use client';

import { useLocalStorage } from './useLocalStorage';

export const DEFAULT_NOTIFICATION_PREFS = {
  push: true,
  email: true,
  sms: false,
  whatsapp: false,
  sound: true,
  orderUpdates: true,
  rentalReminders: true,
  maintenanceUpdates: true,
  promotionalOffers: false,
};

// Shared between the Notifications page and Settings page so a toggle flipped in either
// place is reflected in both — genuinely persisted in the browser, not a decorative switch.
export function useNotificationPrefs() {
  const [prefs, setPrefs] = useLocalStorage('rentease_notification_prefs', DEFAULT_NOTIFICATION_PREFS);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return { prefs, setPrefs, toggle };
}
