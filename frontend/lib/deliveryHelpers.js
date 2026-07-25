// Shared helpers for the Delivery Partner portal. Small, dependency-free utilities used across
// requests/assigned/history/earnings/analytics pages so status copy, address formatting and
// money/time formatting stay identical everywhere instead of drifting page to page.

// OrderItem.status from the backend is snake_case (see backend/src/constants/orderStatus.js),
// but `components/vendor/OrderStatusBadge.js` (reused as-is per the build brief) keys its
// color/copy map on the Title Case labels the vendor's demo-data layer already produces
// (e.g. 'Out for Delivery', 'Active Rental'). This map bridges the real backend value to that
// exact label so the badge renders with the right color instead of falling through to neutral.
const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  active_rental: 'Active Rental',
  extension_requested: 'Extension Requested',
  pickup_scheduled: 'Pickup Scheduled',
  returned: 'Returned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// Order.deliveryAddress is a plain field bag (no single "formatted" string from the API) —
// this assembles the display string used for the address line and for the maps link below.
export function formatAddress(addr) {
  if (!addr) return '';
  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
}

// A plain text-search Maps URL, not real GPS/turn-by-turn — per the build brief this app has
// no live location tracking, so this just opens the address as a Maps search in a new tab.
export function mapsSearchUrl(addressString) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
}

export function money(value) {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
}

export function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isToday(date) {
  if (!date) return false;
  return new Date(date).toDateString() === new Date().toDateString();
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}
