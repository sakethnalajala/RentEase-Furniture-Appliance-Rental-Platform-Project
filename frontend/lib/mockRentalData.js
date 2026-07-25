// Rental History / Payments / Invoices / Maintenance all need Order+Payment backend
// infrastructure that doesn't exist yet (see roadmap). Per explicit product direction, these
// pages ship fully interactive today using demo data synthesized from REAL seeded products
// (real images, names, brands, prices) wrapped in simulated rental/payment records, rather
// than "coming soon" placeholders. Clearly labeled as demo data wherever it's shown.

const STATUSES = ['completed', 'active', 'cancelled', 'extended'];
const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'];

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function buildRentalHistory(products, count = 12) {
  if (!products?.length) return [];
  const rand = seededRandom(42);
  const list = [];

  for (let i = 0; i < Math.min(count, products.length); i++) {
    const product = products[i];
    const durationMonths = [1, 3, 6, 12][Math.floor(rand() * 4)];
    const startedDaysAgo = 20 + Math.floor(rand() * 340);
    const rentalStart = daysAgo(startedDaysAgo);
    const rentalEnd = new Date(rentalStart);
    rentalEnd.setMonth(rentalEnd.getMonth() + durationMonths);
    const status = startedDaysAgo < 35 ? 'active' : STATUSES[Math.floor(rand() * STATUSES.length)];

    list.push({
      id: `RENT-${product._id.slice(-6).toUpperCase()}`,
      product,
      rentalStart,
      rentalEnd,
      durationMonths,
      monthlyRent: product.monthlyRentalPrice,
      deposit: product.securityDeposit,
      status,
    });
  }

  return list.sort((a, b) => b.rentalStart - a.rentalStart);
}

export function buildPayments(rentalHistory) {
  return rentalHistory.map((rental, i) => ({
    invoiceNumber: `INV-2026-${(1000 + i).toString().padStart(4, '0')}`,
    orderId: rental.id,
    rental,
    rentalAmount: rental.monthlyRent,
    securityDeposit: rental.deposit,
    total: rental.monthlyRent + rental.deposit,
    paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
    paymentStatus: rental.status === 'cancelled' ? 'refunded' : 'paid',
    transactionId: `TXN${(900000000 + i * 137).toString()}`,
    date: rental.rentalStart,
  }));
}

const MAINTENANCE_ISSUES = [
  'Making an unusual noise during operation.',
  'Minor wear and tear on the surface — requesting inspection.',
  'Not powering on consistently.',
  'A component appears loose and needs tightening.',
  'Requesting a routine maintenance check-up.',
];
const MAINTENANCE_STATUSES = ['submitted', 'technician_assigned', 'resolved'];

export function buildMaintenanceRequests(products, count = 4) {
  if (!products?.length) return [];
  const rand = seededRandom(7);
  const list = [];
  for (let i = 0; i < Math.min(count, products.length); i++) {
    const product = products[i];
    const status = MAINTENANCE_STATUSES[i % MAINTENANCE_STATUSES.length];
    list.push({
      id: `MNT-${product._id.slice(-6).toUpperCase()}`,
      product,
      description: MAINTENANCE_ISSUES[Math.floor(rand() * MAINTENANCE_ISSUES.length)],
      status,
      technician: status !== 'submitted' ? 'Ramesh Kumar' : null,
      createdAt: daysAgo(3 + i * 6),
      resolvedAt: status === 'resolved' ? daysAgo(1 + i) : null,
    });
  }
  return list;
}

const NOTIFICATION_TEMPLATES = [
  { type: 'order', title: 'Order confirmed', body: 'Your rental order has been confirmed and is being prepared.' },
  { type: 'order', title: 'Out for delivery', body: 'Your product is out for delivery — track it from Current Rentals.' },
  { type: 'rental', title: 'Rental renewal reminder', body: 'Your rental plan renews in 5 days. Manage it anytime.' },
  { type: 'maintenance', title: 'Technician assigned', body: 'A technician has been assigned to your maintenance request.' },
  { type: 'maintenance', title: 'Maintenance resolved', body: 'Your maintenance request has been marked resolved.' },
  { type: 'promotion', title: '20% off 12-month plans', body: 'Switch to a 12-month plan this week and save more.' },
  { type: 'promotion', title: 'New arrivals in Furniture', body: 'Fresh sofas and recliners just landed in your city.' },
  { type: 'order', title: 'Payment received', body: 'We’ve received your monthly rental payment. Thank you!' },
  { type: 'rental', title: 'Extension approved', body: 'Your rental extension request has been approved.' },
];

export function buildNotifications() {
  return NOTIFICATION_TEMPLATES.map((n, i) => ({
    id: `NTF-${i + 1}`,
    ...n,
    read: i > 3,
    createdAt: daysAgo(i * 2),
  }));
}

const REVIEWER_NAMES = ['Ananya R.', 'Vikram S.', 'Priya M.', 'Rahul K.', 'Sneha T.', 'Arjun P.', 'Divya N.'];
const REVIEW_COMMENTS = [
  'Great condition and exactly as described. Delivery was quick too.',
  'Good value for the monthly rent. Would rent again.',
  'Works well, minor wear but nothing that affects use.',
  'Setup was easy and the vendor was responsive.',
  'Solid quality — feels much newer than expected.',
  'Does the job. Delivery took a day longer than promised.',
];

// Product reviews are demo data too — the Review model requires a completed order (which
// doesn't exist yet), so these are deterministic per product (same product always shows the
// same reviews) rather than real customer submissions.
export function buildProductReviews(product) {
  if (!product) return [];
  const seed = product._id
    .toString()
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const count = 3 + Math.floor(rand() * 3);

  return Array.from({ length: count }).map((_, i) => ({
    id: `${product._id}-review-${i}`,
    name: REVIEWER_NAMES[Math.floor(rand() * REVIEWER_NAMES.length)],
    rating: Math.max(3, Math.round(product.averageRating + (rand() - 0.5) * 1.5)),
    comment: REVIEW_COMMENTS[Math.floor(rand() * REVIEW_COMMENTS.length)],
    createdAt: daysAgo(5 + Math.floor(rand() * 120)),
  }));
}
