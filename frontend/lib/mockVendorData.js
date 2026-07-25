// Vendor-side Orders / Rental Requests / Messages need an Order+Chat backend that doesn't
// exist yet (see backend/src/routes/index.js roadmap comments). Per product direction, these
// pages ship fully interactive today using demo data synthesized from the vendor's REAL
// products (real names, images, prices, SKUs pulled live from MongoDB) wrapped in simulated
// order/message records — not "coming soon" placeholders. Deterministic per product so the
// same vendor always sees the same demo pipeline across reloads.

const CUSTOMER_NAMES = [
  'Ananya Rao', 'Vikram Sharma', 'Priya Menon', 'Rahul Kapoor', 'Sneha Iyer',
  'Arjun Patel', 'Divya Nair', 'Karthik Reddy', 'Meera Joshi', 'Rohan Gupta',
  'Ishita Singh', 'Aditya Verma', 'Pooja Desai', 'Nikhil Malhotra', 'Kavya Pillai',
  'Siddharth Rao', 'Anjali Bose', 'Varun Chopra', 'Tanya Agarwal', 'Manish Kulkarni',
];

const ORDER_STATUSES = [
  'Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Active Rental',
  'Extension Requested', 'Pickup Scheduled', 'Returned', 'Completed', 'Cancelled',
];

const REQUEST_STATUSES = ['Requested', 'Under Review', 'Approved', 'Declined', 'Delivered'];

const DELIVERY_CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai'];
const STREET_NAMES = [
  'MG Road', 'Park Street', 'Lake View Avenue', 'Church Street', 'Brigade Road',
  'Jubilee Hills Road No. 5', 'Anna Salai', 'Linking Road', 'Banjara Hills Road No. 12',
  'Residency Road', 'Marine Drive', 'Koramangala 5th Block', 'Gachibowli Main Road',
  'Adyar Main Road', 'Bandra West', 'HITEC City Road',
];
const DELIVERY_TIME_SLOTS = ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM'];
const RENTAL_PLAN_LABELS = { 1: '1 Month', 3: '3 Months', 6: '6 Months', 12: '12 Months' };

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

export function buildVendorOrders(products, count = 24) {
  if (!products?.length) return [];
  const rand = seededRandom(101);
  const list = [];

  for (let i = 0; i < Math.min(count, products.length); i++) {
    const product = products[i];
    const customerName = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const durationMonths = [1, 3, 6, 12][Math.floor(rand() * 4)];
    const status = i < 3 ? 'Pending' : ORDER_STATUSES[Math.floor(rand() * ORDER_STATUSES.length)];
    const orderDate = daysAgo(i * 2 + Math.floor(rand() * 3));

    list.push({
      id: `ORD-2026-${(4000 + i * 37).toString()}`,
      customerName,
      customerEmail: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      product,
      durationMonths,
      monthlyAmount: product.monthlyRentalPrice,
      deposit: product.securityDeposit,
      status,
      orderDate,
    });
  }

  return list.sort((a, b) => b.orderDate - a.orderDate);
}

// `count` (target 200+) intentionally isn't capped at products.length — a real vendor's popular
// products legitimately get multiple different rental requests over time from different
// customers, so cycling back through the product pool (via modulo) once `count` exceeds it is
// realistic, not a data quality issue. Each cycle-through varies customer/city/date/duration/
// quantity so no two requests are identical even when they reference the same product.
export function buildRentalRequests(products, count = 220) {
  if (!products?.length) return [];
  const rand = seededRandom(202);
  const list = [];

  for (let i = 0; i < count; i++) {
    // `idx` is always within [0, products.length - 1] before the subtraction, so this never
    // produces a negative array index the way `(products.length - 1 - i) % products.length`
    // would once `i` exceeds products.length (JS `%` doesn't wrap negatives to positive).
    const idx = i % products.length;
    const product = products[products.length - 1 - idx];
    const customerName = CUSTOMER_NAMES[(i + 5) % CUSTOMER_NAMES.length];
    const city = DELIVERY_CITIES[Math.floor(rand() * DELIVERY_CITIES.length)];
    const street = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
    const houseNo = 1 + Math.floor(rand() * 400);
    const requestedMonths = [1, 3, 6, 12][Math.floor(rand() * 4)];
    const quantity = rand() < 0.85 ? 1 : rand() < 0.96 ? 2 : 3;

    list.push({
      id: `REQ-2026-${(5000 + i * 23).toString()}`,
      customerName,
      product,
      categoryName: product.category?.name || 'Uncategorized',
      requestedMonths,
      rentalPlanLabel: RENTAL_PLAN_LABELS[requestedMonths],
      quantity,
      status: REQUEST_STATUSES[Math.floor(rand() * REQUEST_STATUSES.length)],
      requestedAt: daysAgo(Math.floor(i / 2) + Math.floor(rand() * 3)),
      deliveryCity: city,
      deliveryAddress: `${houseNo}, ${street}, ${city}`,
      preferredDeliveryTime: DELIVERY_TIME_SLOTS[Math.floor(rand() * DELIVERY_TIME_SLOTS.length)],
      message: 'Interested in renting this — is it available for immediate delivery?',
    });
  }

  return list.sort((a, b) => b.requestedAt - a.requestedAt);
}

const CUSTOMER_OPENERS = [
  'Hi, is this still available in my city?',
  'Can you confirm the delivery date for my order?',
  'Is installation included in the rental price?',
  'I would like to extend my rental by 3 months.',
  'The product arrived with a minor scratch — can you help?',
  'What is the process for early return?',
  'Do you offer a discount for 12-month plans?',
  'Does this come with a warranty during the rental period?',
  'Can I schedule delivery for next weekend?',
  'Is the security deposit refund immediate after return?',
];
const VENDOR_REPLIES = [
  "Yes, it's available — we can have it delivered within 2-3 business days.",
  "Absolutely, delivery is scheduled and you'll get a confirmation SMS the day before.",
  'Yes, installation is included at no extra cost for this product.',
  "Sure, I'll process the extension — it'll reflect in your account shortly.",
  "Sorry to hear that — we'll arrange a free replacement or repair, whichever you prefer.",
  "You can request an early return from the Rentals page, and we'll schedule a pickup.",
  'Yes, 12-month plans get our maximum discount tier automatically applied.',
  "Yes, it's covered under our standard rental warranty for the full rental period.",
  "Weekend delivery works — I'll block a slot and confirm the time with you.",
  'Refunds are processed within 5-7 business days after the return inspection.',
];
const CUSTOMER_FOLLOWUPS = [
  'Perfect, thank you!',
  'Great, appreciate the quick response.',
  'Sounds good, thanks for confirming.',
  'That works for me, thanks!',
  'Understood, thank you.',
];

// Each thread gets a genuine multi-message conversation (not just a "last message" preview
// string) so the Messages page can render real chat history — customer/vendor turns, varying
// length, deterministic per product index so the same vendor sees the same conversations
// across reloads. Vendor-sent replies get appended to this array client-side (see the Messages
// page), which is what makes a sent reply show up in the thread immediately instead of only as
// a toast.
export function buildVendorMessages(products, count = 10) {
  if (!products?.length) return [];
  const rand = seededRandom(303);
  const list = [];

  for (let i = 0; i < Math.min(count, products.length); i++) {
    const product = products[i];
    const customerName = CUSTOMER_NAMES[(i + 2) % CUSTOMER_NAMES.length];

    const baseTime = daysAgo(i);
    baseTime.setHours(9 + Math.floor(rand() * 8), Math.floor(rand() * 60), 0, 0);
    let cursor = baseTime;

    const conversation = [];
    const addMessage = (sender, text, minutesLater = 0) => {
      cursor = new Date(cursor.getTime() + minutesLater * 60000);
      conversation.push({ id: `${i}-${conversation.length}`, sender, text, timestamp: new Date(cursor) });
    };

    addMessage('customer', CUSTOMER_OPENERS[(i * 3) % CUSTOMER_OPENERS.length]);
    addMessage('vendor', VENDOR_REPLIES[(i * 3) % VENDOR_REPLIES.length], 4 + Math.floor(rand() * 20));
    if (rand() > 0.35) {
      addMessage('customer', CUSTOMER_FOLLOWUPS[(i + 1) % CUSTOMER_FOLLOWUPS.length], 2 + Math.floor(rand() * 10));
    }
    if (rand() > 0.7) {
      addMessage('customer', CUSTOMER_OPENERS[(i * 3 + 1) % CUSTOMER_OPENERS.length], 30 + Math.floor(rand() * 120));
      addMessage('vendor', VENDOR_REPLIES[(i * 3 + 1) % VENDOR_REPLIES.length], 5 + Math.floor(rand() * 15));
    }

    const last = conversation[conversation.length - 1];
    list.push({
      id: `MSG-${i + 1}`,
      customerName,
      product,
      conversation,
      lastMessage: last.text,
      lastSender: last.sender,
      unread: i < 3,
      updatedAt: last.timestamp,
    });
  }

  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

const STATUS_GROUP_MAP = {
  Pending: 'pending',
  Confirmed: 'active',
  Preparing: 'active',
  'Out for Delivery': 'active',
  Delivered: 'completed',
  'Active Rental': 'active',
  'Extension Requested': 'active',
  'Pickup Scheduled': 'active',
  Returned: 'completed',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

export function statusGroup(status) {
  return STATUS_GROUP_MAP[status] || 'active';
}

const ACTIVE_STATUSES = new Set(['Active Rental', 'Extension Requested']);
const PENDING_DELIVERY_STATUSES = new Set(['Confirmed', 'Preparing', 'Out for Delivery', 'Pickup Scheduled']);
const RETURNED_STATUSES = new Set(['Returned', 'Completed']);

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}
function monthLabel(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

// The single source of truth for the Vendor Analytics dashboard. Wherever a real signal exists
// (product stock/rating/unitsRented from MongoDB, order status/duration/city from the demo
// order pipeline) it's used directly; anything that would require data this app doesn't
// generate yet (true historical inventory/customer counts — every product was seeded at once,
// so there's no real creation-date spread to chart) is clearly synthesized and labeled as such
// in the UI, same as the rest of this file's demo-data pattern.
export function buildVendorAnalytics(products, stats) {
  const orders = buildVendorOrders(products, 260);
  const now = new Date();
  const currentYear = now.getFullYear();

  // --- Monthly revenue & orders (last 12 calendar months) ---
  const monthBuckets = Array.from({ length: 12 }).map((_, i) => ({
    label: monthLabel(11 - i),
    key: monthKey(new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)),
    revenue: 0,
    orders: 0,
  }));
  const bucketByKey = Object.fromEntries(monthBuckets.map((b) => [b.key, b]));
  orders.forEach((o) => {
    const bucket = bucketByKey[monthKey(new Date(o.orderDate))];
    if (bucket) {
      bucket.revenue += o.monthlyAmount;
      bucket.orders += 1;
    }
  });

  // --- Weekly orders (last 8 weeks) ---
  const weeklyOrders = Array.from({ length: 8 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i) * 7);
    return { label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: 0 };
  });
  orders.forEach((o) => {
    const daysAgoCount = Math.floor((now - new Date(o.orderDate)) / 86400000);
    const weekIndex = 7 - Math.min(7, Math.floor(daysAgoCount / 7));
    if (weeklyOrders[weekIndex]) weeklyOrders[weekIndex].value += 1;
  });

  // --- Yearly revenue: this year vs last year ---
  const yearlyRevenue = [0, 1].map((yearsAgo) => {
    const year = currentYear - (1 - yearsAgo);
    const total = orders
      .filter((o) => new Date(o.orderDate).getFullYear() === year)
      .reduce((sum, o) => sum + o.monthlyAmount * o.durationMonths, 0);
    return { label: String(year), value: total };
  });

  // --- Customer growth: distinct customers' first-appearance month, cumulative ---
  const seenCustomers = new Set();
  const newCustomersByMonth = Object.fromEntries(monthBuckets.map((b) => [b.key, 0]));
  [...orders].sort((a, b) => a.orderDate - b.orderDate).forEach((o) => {
    if (seenCustomers.has(o.customerName)) return;
    seenCustomers.add(o.customerName);
    const key = monthKey(new Date(o.orderDate));
    if (key in newCustomersByMonth) newCustomersByMonth[key] += 1;
  });
  let cumulativeCustomers = Math.max(0, seenCustomers.size - monthBuckets.reduce((s, b) => s + (newCustomersByMonth[b.key] || 0), 0));
  const customerGrowth = monthBuckets.map((b) => {
    cumulativeCustomers += newCustomersByMonth[b.key] || 0;
    return { label: b.label, value: cumulativeCustomers };
  });

  // --- Inventory growth: demo-illustrative cumulative curve ending at the real product count
  // (every product was seeded at once, so there's no genuine historical creation-date spread
  // to chart — this is clearly a demo trend, not a claim about real history) ---
  const finalCount = stats?.totalProducts || products.length;
  const inventoryGrowth = monthBuckets.map((b, i) => {
    const growthCurve = 0.35 + 0.65 * ((i + 1) / monthBuckets.length) ** 1.4;
    return { label: b.label, value: Math.round(finalCount * growthCurve) };
  });

  // --- City-wise + category revenue/order splits ---
  const cityTotals = {};
  const cityOrderCounts = {};
  const categoryTotals = {};
  orders.forEach((o) => {
    const city = o.product.city?.name || 'Unknown';
    const category = o.product.category?.name || 'Uncategorized';
    cityTotals[city] = (cityTotals[city] || 0) + o.monthlyAmount;
    cityOrderCounts[city] = (cityOrderCounts[city] || 0) + 1;
    categoryTotals[category] = (categoryTotals[category] || 0) + o.monthlyAmount;
  });
  const revenueByCity = Object.entries(cityTotals).map(([label, value]) => ({ label, value }));
  const ordersByCity = Object.entries(cityOrderCounts).map(([label, value]) => ({ label, value }));
  const revenueByCategory = Object.entries(categoryTotals).map(([label, value]) => ({ label, value }));

  // --- Top products (real unitsRented) ---
  const topProducts = [...products]
    .sort((a, b) => (b.unitsRented || 0) - (a.unitsRented || 0))
    .slice(0, 8)
    .map((p) => ({ label: p.name, value: p.unitsRented || 0, image: p.images?.[0] }));

  // --- Top categories (real, from backend aggregate) ---
  const topCategories = (stats?.bySubCategory || []).slice(0, 8).map((s) => ({ label: s._id, value: s.count }));

  // --- Rating distribution (real averageRating, bucketed to nearest star) ---
  const ratingBuckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  products.forEach((p) => {
    const star = Math.min(5, Math.max(1, Math.round(p.averageRating || 0)));
    ratingBuckets[star] += 1;
  });
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({ label: `${star} star${star > 1 ? 's' : ''}`, value: ratingBuckets[star] }));

  // --- Rental duration analysis ---
  const durationTotals = { 1: 0, 3: 0, 6: 0, 12: 0 };
  orders.forEach((o) => {
    durationTotals[o.durationMonths] = (durationTotals[o.durationMonths] || 0) + 1;
  });
  const rentalDurationAnalysis = [1, 3, 6, 12].map((m) => ({ label: RENTAL_PLAN_LABELS[m], value: durationTotals[m] }));

  // --- Order-status-derived KPIs ---
  const activeRentals = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
  const pendingDeliveries = orders.filter((o) => PENDING_DELIVERY_STATUSES.has(o.status)).length;
  const returnedProducts = orders.filter((o) => RETURNED_STATUSES.has(o.status)).length;
  const cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length;

  const statusCounts = { pending: 0, active: 0, completed: 0, cancelled: 0 };
  orders.forEach((o) => {
    statusCounts[statusGroup(o.status)] += 1;
  });

  const totalRevenueThisYear = yearlyRevenue[1]?.value || 0;
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? Math.round(orders.reduce((s, o) => s + o.monthlyAmount * o.durationMonths, 0) / totalOrders) : 0;

  // Composite score blending real signals (catalog rating, stock health) with the demo order
  // pipeline's completion rate — presented as a single 0-100 "performance score" the way real
  // marketplace seller dashboards do, not a raw fact.
  const ratingComponent = ((stats?.averageRating || 0) / 5) * 40;
  const stockHealthComponent = stats?.totalProducts ? (1 - (stats.lowStockCount || 0) / stats.totalProducts) * 30 : 20;
  const fulfillmentComponent = totalOrders ? (statusCounts.completed / totalOrders) * 30 : 15;
  const vendorPerformanceScore = Math.round(Math.min(100, ratingComponent + stockHealthComponent + fulfillmentComponent));

  const inventoryUtilization = stats?.totalStock
    ? Math.round((100 * (stats.totalUnitsRented || 0)) / ((stats.totalUnitsRented || 0) + stats.totalStock))
    : 0;

  // Demo-illustrative (no real page-view/funnel data exists yet) but seeded from the vendor's
  // own product count so it stays stable across reloads rather than jumping around randomly.
  const conversionRate = Math.min(92, 58 + ((stats?.totalProducts || 0) % 30));

  return {
    monthlyRevenue: monthBuckets.map((b) => ({ label: b.label, value: b.revenue })),
    monthlyOrders: monthBuckets.map((b) => ({ label: b.label, value: b.orders })),
    weeklyOrders,
    yearlyRevenue,
    customerGrowth,
    inventoryGrowth,
    revenueByCity,
    ordersByCity,
    revenueByCategory,
    topProducts,
    topCategories,
    ratingDistribution,
    rentalDurationAnalysis,
    statusCounts,
    activeRentals,
    pendingDeliveries,
    returnedProducts,
    cancelledOrders,
    totalRevenueThisYear,
    totalOrders,
    avgOrderValue,
    vendorPerformanceScore,
    inventoryUtilization,
    conversionRate,
    orders,
  };
}

export { ORDER_STATUSES, REQUEST_STATUSES };
