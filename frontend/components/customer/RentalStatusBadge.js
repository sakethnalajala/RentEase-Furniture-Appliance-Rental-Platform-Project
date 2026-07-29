import Badge from '@/components/ui/Badge';

// Covers both the simplified 4-value status this badge originally shipped with and the real
// OrderItem lifecycle values (pending/confirmed/preparing/...) it's now also fed directly —
// same badge, no separate component needed for real vs. simplified callers.
const VARIANTS = {
  active: 'success',
  active_rental: 'success',
  completed: 'brand',
  returned: 'brand',
  cancelled: 'accent',
  extended: 'neutral',
  extension_requested: 'neutral',
  pending: 'neutral',
  confirmed: 'neutral',
  preparing: 'neutral',
  out_for_delivery: 'neutral',
  delivered: 'brand',
  pickup_scheduled: 'neutral',
};
const LABELS = {
  active: 'Active',
  active_rental: 'Active',
  completed: 'Completed',
  returned: 'Returned',
  cancelled: 'Cancelled',
  extended: 'Extended',
  extension_requested: 'Extension Requested',
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  pickup_scheduled: 'Pickup Scheduled',
};

export default function RentalStatusBadge({ status }) {
  return <Badge variant={VARIANTS[status] || 'neutral'}>{LABELS[status] || status}</Badge>;
}
