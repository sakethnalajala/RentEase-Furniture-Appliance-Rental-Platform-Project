import Badge from '@/components/ui/Badge';

const VARIANTS = { active: 'success', completed: 'brand', cancelled: 'accent', extended: 'neutral' };
const LABELS = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled', extended: 'Extended' };

export default function RentalStatusBadge({ status }) {
  return <Badge variant={VARIANTS[status] || 'neutral'}>{LABELS[status] || status}</Badge>;
}
