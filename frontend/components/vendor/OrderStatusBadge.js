import Badge from '@/components/ui/Badge';

const VARIANTS = {
  Pending: 'neutral',
  Confirmed: 'brand',
  Preparing: 'brand',
  'Out for Delivery': 'accent',
  Delivered: 'success',
  'Active Rental': 'success',
  'Extension Requested': 'accent',
  'Pickup Scheduled': 'accent',
  Returned: 'neutral',
  Completed: 'success',
  Cancelled: 'neutral',
  Requested: 'accent',
  'Under Review': 'brand',
  Approved: 'success',
  Declined: 'neutral',
};

const OVERRIDE_CLASS = {
  Cancelled: '!bg-rose-100 !text-rose-700 dark:!bg-rose-500/15 dark:!text-rose-300',
  Declined: '!bg-rose-100 !text-rose-700 dark:!bg-rose-500/15 dark:!text-rose-300',
};

export default function OrderStatusBadge({ status, className = '' }) {
  return (
    <Badge variant={VARIANTS[status] || 'neutral'} className={`${OVERRIDE_CLASS[status] || ''} ${className}`}>
      {status}
    </Badge>
  );
}
