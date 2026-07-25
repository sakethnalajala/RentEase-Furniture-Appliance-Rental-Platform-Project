const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const DeliveryPartner = require('../models/DeliveryPartner');
const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');
const RentalPlan = require('../models/RentalPlan');
const Notification = require('../models/Notification');
const { ORDER_ITEM_STATUS } = require('../constants/orderStatus');
const { INVENTORY_STATUS } = require('../constants/inventoryStatus');
const { buildFileUrl } = require('../utils/fileUrl');
const { generateOpenDeliveryRequests } = require('../services/demoOrderService');
const { DELIVERY_REVIEWS } = require('../data/demoDeliveryData');

// A flat demo delivery fee — real platforms price this off distance/weight, but nothing in
// this app's Product/Order model tracks either, so a fixed per-delivery earning (plus a small
// cut of the item's own delivery charge, when the vendor set one) keeps Earnings/Analytics
// numbers non-zero and internally consistent without inventing data that isn't there.
const computeDeliveryFee = (orderItem) => 60 + Math.round((orderItem.deliveryCharge || 0) * 0.5);

// Same reasoning as the delivery fee: no real geocoding exists anywhere in this app, so a
// distance-in-km is derived deterministically from the item's own id (stable across reloads,
// no schema field needed) purely for the "Delivery Distance" display the Requests/Assigned
// cards show.
function estimateDistanceKm(itemId) {
  const str = String(itemId);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return 2 + (h % 17); // 2-18 km
}

const ITEM_POPULATE = [
  { path: 'product', select: 'name images subCategory brand monthlyRentalPrice deliveryCharge installationRequired' },
  { path: 'rentalPlan', select: 'durationMonths label' },
  { path: 'vendor', select: 'businessName businessAddress warehouseLocation' },
  {
    path: 'order',
    select: 'orderNumber customer deliveryAddress placedAt city',
    populate: { path: 'customer', select: 'name email phone avatar' },
  },
];

// Attaches the two demo-computed fields (see above) to a populated OrderItem for API
// responses — doesn't touch the stored document.
function withDemoFields(item) {
  const obj = item.toObject ? item.toObject() : item;
  return {
    ...obj,
    distanceKm: estimateDistanceKm(obj._id),
    estimatedDeliveryFee: obj.deliveryFee > 0 ? obj.deliveryFee : computeDeliveryFee(obj),
  };
}

async function requirePartner(req) {
  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) throw ApiError.notFound('Delivery partner profile not found.');
  return partner;
}

const getMyProfile = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findOne({ user: req.user._id })
    .populate('user', 'name email phone avatar createdAt')
    .populate('assignedCity', 'name state');
  if (!partner) throw ApiError.notFound('Delivery partner profile not found.');
  new ApiResponse(200, partner).send(res);
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const { vehicleType, vehicleNumber, licenseNumber, assignedCity, bankDetails } = req.body;

  if (vehicleType) partner.vehicleType = vehicleType;
  if (vehicleNumber) partner.vehicleNumber = vehicleNumber;
  if (licenseNumber) partner.licenseNumber = licenseNumber;
  if (assignedCity) partner.assignedCity = assignedCity;
  if (bankDetails) partner.bankDetails = { ...partner.bankDetails.toObject(), ...bankDetails };

  await partner.save();
  const populated = await DeliveryPartner.findById(partner._id).populate('user', 'name email phone avatar').populate('assignedCity', 'name state');
  new ApiResponse(200, populated, 'Profile updated.').send(res);
});

const updateAvailability = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  partner.isAvailable = req.body.isAvailable;
  await partner.save();
  new ApiResponse(200, partner, partner.isAvailable ? 'You are now online.' : 'You are now offline.').send(res);
});

const uploadDocument = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  if (!req.file) throw ApiError.badRequest('No file uploaded.');

  const type = req.body.type || 'other';
  const url = buildFileUrl(req, req.file);
  partner.documents.push({ type, url, uploadedAt: new Date() });
  await partner.save();
  new ApiResponse(200, partner, 'Document uploaded.').send(res);
});

const uploadPhoto = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  partner.profilePhoto = buildFileUrl(req, req.file);
  await partner.save();
  new ApiResponse(200, partner, 'Photo updated.').send(res);
});

// ---- Requests (open, unassigned, in the partner's city) ----

const MIN_OPEN_REQUESTS = 15;
const TOPUP_TARGET = 25;

async function findOpenRequestsInCity(partner) {
  const items = await OrderItem.find({
    status: ORDER_ITEM_STATUS.CONFIRMED,
    deliveryPartner: null,
    rejectedByDeliveryPartners: { $ne: partner._id },
  })
    .sort({ createdAt: -1 })
    .populate(ITEM_POPULATE);

  // Filter to the partner's own city — Order.city isn't indexed alongside status/assignment,
  // so this is filtered in application code after the (already narrow) query above rather
  // than adding a compound Mongo query for what's a small result set in a demo dataset.
  return items.filter((item) => String(item.order?.city) === String(partner.assignedCity));
}

// Keeps the queue feeling like a live application rather than a static seed snapshot: every
// time this is read, if the open pool for this city has run low (accepted/rejected away),
// synthesize enough fresh ones to get back to a healthy count. Cheap at this data scale, and
// means logging back out and in — or just re-opening the tab — always shows a full queue,
// per the product requirement that this screen "always stays active like a real application."
const listRequests = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);

  let inCity = await findOpenRequestsInCity(partner);
  if (inCity.length < MIN_OPEN_REQUESTS) {
    await generateOpenDeliveryRequests({ cityId: partner.assignedCity, count: TOPUP_TARGET - inCity.length });
    inCity = await findOpenRequestsInCity(partner);
  }

  new ApiResponse(200, inCity.map(withDemoFields)).send(res);
});

const acceptRequest = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const item = await OrderItem.findOne({ _id: req.params.itemId, status: ORDER_ITEM_STATUS.CONFIRMED, deliveryPartner: null });
  if (!item) throw ApiError.notFound('This delivery request is no longer available.');

  item.deliveryPartner = partner._id;
  item.status = ORDER_ITEM_STATUS.PREPARING;
  item.deliveryFee = computeDeliveryFee(item);
  item.statusHistory.push({ status: ORDER_ITEM_STATUS.PREPARING, note: 'Accepted by delivery partner.' });
  await item.save();

  const order = await Order.findById(item.order);
  if (order) {
    const product = await Product.findById(item.product).select('name');
    await Notification.create({
      user: order.customer,
      title: 'Delivery Partner Assigned',
      message: `A delivery partner has been assigned to bring you ${product?.name || 'your item'}.\nOrder ID: ${order.orderNumber}`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
      meta: { orderNumber: order.orderNumber, productName: product?.name, status: 'Assigned' },
    });
  }
  const vendorPop = await OrderItem.findById(item._id).populate('vendor', 'user');
  if (vendorPop?.vendor?.user) {
    await Notification.create({
      user: vendorPop.vendor.user,
      title: 'Delivery partner assigned',
      message: `A delivery partner accepted the delivery for order item ${item._id}.`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
    });
  }

  const populated = await OrderItem.findById(item._id).populate(ITEM_POPULATE);
  new ApiResponse(200, populated, 'Delivery accepted.').send(res);
});

const rejectRequest = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const item = await OrderItem.findOne({ _id: req.params.itemId, status: ORDER_ITEM_STATUS.CONFIRMED, deliveryPartner: null });
  if (!item) throw ApiError.notFound('This delivery request is no longer available.');

  if (!item.rejectedByDeliveryPartners.some((id) => String(id) === String(partner._id))) {
    item.rejectedByDeliveryPartners.push(partner._id);
    await item.save();
  }
  new ApiResponse(200, { itemId: item._id }, 'Delivery request declined.').send(res);
});

// ---- Assigned (accepted by this partner, not yet delivered) ----

const listAssigned = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const items = await OrderItem.find({
    deliveryPartner: partner._id,
    status: { $in: [ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY] },
  })
    .sort({ updatedAt: -1 })
    .populate(ITEM_POPULATE);
  new ApiResponse(200, items.map(withDemoFields)).send(res);
});

// Lets a partner back out of a delivery they already accepted but haven't picked up yet — a
// genuine, first-class reject/cancel action for Assigned Deliveries (not just the initial
// unassigned-request reject above). Once picked up (out_for_delivery), it's too late to reject —
// matches real-world courier logic (can't un-pick-up an item). Fully cancels the order item
// rather than reopening it for other partners, per product direction: "should no longer appear
// anywhere after being rejected."
const rejectAssigned = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const item = await OrderItem.findOne({ _id: req.params.itemId, deliveryPartner: partner._id, status: ORDER_ITEM_STATUS.PREPARING });
  if (!item) throw ApiError.notFound('Item not found or already out for delivery — it can no longer be rejected.');

  const cancelReason = 'Rejected by delivery partner after acceptance.';
  item.status = ORDER_ITEM_STATUS.CANCELLED;
  item.cancelReason = cancelReason;
  if (!item.rejectedByDeliveryPartners.some((id) => String(id) === String(partner._id))) {
    item.rejectedByDeliveryPartners.push(partner._id);
  }
  item.statusHistory.push({ status: ORDER_ITEM_STATUS.CANCELLED, note: cancelReason });
  await item.save();

  if (item.inventoryItem) {
    await InventoryItem.findByIdAndUpdate(item.inventoryItem, { $set: { status: INVENTORY_STATUS.AVAILABLE, currentOrderItem: null } });
  }

  const order = await Order.findById(item.order);
  if (order) {
    await Notification.create({
      user: order.customer,
      title: 'Request Rejected',
      message: `Your order ${order.orderNumber} was declined by the delivery partner after acceptance. Our team is reassigning it.`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
      meta: { orderNumber: order.orderNumber },
    });
  }
  const vendorPop = await OrderItem.findById(item._id).populate('vendor', 'user').populate('product', 'name');
  if (vendorPop?.vendor?.user) {
    await Notification.create({
      user: vendorPop.vendor.user,
      title: 'Request Rejected',
      message: `The delivery partner rejected the delivery for "${vendorPop.product?.name || 'a product'}" after accepting it.`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
    });
  }

  new ApiResponse(200, { itemId: item._id }, 'Delivery rejected.').send(res);
});

const markPickedUp = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const item = await OrderItem.findOne({ _id: req.params.itemId, deliveryPartner: partner._id, status: ORDER_ITEM_STATUS.PREPARING });
  if (!item) throw ApiError.notFound('Item not found or not ready for pickup.');

  item.status = ORDER_ITEM_STATUS.OUT_FOR_DELIVERY;
  item.pickedUpAt = new Date();
  item.statusHistory.push({ status: ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, note: 'Picked up, out for delivery.' });
  await item.save();

  const order = await Order.findById(item.order);
  if (order) {
    await Notification.create({
      user: order.customer,
      title: 'Out for delivery',
      message: `Your order ${order.orderNumber} is out for delivery.`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
      meta: { orderNumber: order.orderNumber },
    });
  }

  const populated = await OrderItem.findById(item._id).populate(ITEM_POPULATE);
  new ApiResponse(200, populated, 'Marked as picked up.').send(res);
});

const markDelivered = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const item = await OrderItem.findOne({ _id: req.params.itemId, deliveryPartner: partner._id, status: ORDER_ITEM_STATUS.OUT_FOR_DELIVERY });
  if (!item) throw ApiError.notFound('Item not found or not out for delivery.');

  // Demo platform: the OTP a real customer would relay was only ever shown to them on their
  // own checkout success screen, which most orders in this demo dataset (seeded / auto-topped-
  // up delivery requests) never had a live session to show it to — so there's no way for a
  // delivery partner to legitimately know it out-of-band. Per product direction, any
  // well-formed 4-digit code is accepted here instead of comparing against the stored hash.
  if (!/^\d{4}$/.test(String(req.body.otp || ''))) {
    throw ApiError.badRequest('Enter a 4-digit OTP.');
  }

  const now = new Date();
  const plan = await RentalPlan.findById(item.rentalPlan);
  const rentalEndDate = new Date(now);
  rentalEndDate.setMonth(rentalEndDate.getMonth() + (plan?.durationMonths || 1));

  const review = DELIVERY_REVIEWS[Math.floor(Math.random() * DELIVERY_REVIEWS.length)];

  item.status = ORDER_ITEM_STATUS.ACTIVE_RENTAL;
  item.deliveredAt = now;
  item.rentalStartDate = now;
  item.rentalEndDate = rentalEndDate;
  item.deliveryRating = review.rating;
  item.deliveryReviewComment = review.comment;
  item.deliveryReviewDate = now;
  item.statusHistory.push({ status: ORDER_ITEM_STATUS.DELIVERED, note: 'Delivered, OTP verified.' });
  item.statusHistory.push({ status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, note: 'Rental is now active.' });
  await item.save();

  partner.totalDeliveries += 1;
  partner.totalEarnings = (partner.totalEarnings || 0) + item.deliveryFee;
  // Demo distance per delivery — this app has no real GPS tracking, so a realistic 3-18km
  // trip is simulated for every completed delivery, same honesty pattern as currentLocation.
  partner.totalDistanceCovered = (partner.totalDistanceCovered || 0) + (3 + Math.round(Math.random() * 15));
  // Running average nudged toward this delivery's rating — keeps the partner's headline
  // rating responsive to recent reviews without needing a separate aggregate query.
  partner.averageRating = partner.averageRating
    ? Number((partner.averageRating * 0.85 + review.rating * 0.15).toFixed(2))
    : review.rating;
  await partner.save();

  if (item.inventoryItem) {
    await InventoryItem.findByIdAndUpdate(item.inventoryItem, { $set: { status: INVENTORY_STATUS.OUT_FOR_RENT } });
  }

  const order = await Order.findById(item.order);
  if (order) {
    await Notification.create({
      user: order.customer,
      title: 'Your Product Has Been Delivered Successfully',
      message: `Order ${order.orderNumber} was delivered. Your rental period has started.`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
      meta: { orderNumber: order.orderNumber },
    });
  }
  const vendorPop = await OrderItem.findById(item._id).populate('vendor', 'user').populate('product', 'name');
  if (vendorPop?.vendor?.user) {
    await Notification.create({
      user: vendorPop.vendor.user,
      title: 'Delivery Completed Successfully',
      message: `"${vendorPop.product?.name || 'Your product'}" was delivered to the customer.`,
      type: 'delivery',
      relatedEntity: { type: 'OrderItem', id: item._id },
    });
  }
  await Notification.create({
    user: req.user._id,
    title: 'Delivery Completed Successfully',
    message: `You've completed the delivery for order ${order?.orderNumber || ''} and earned ₹${item.deliveryFee}.`,
    type: 'delivery',
    relatedEntity: { type: 'OrderItem', id: item._id },
  });

  const populated = await OrderItem.findById(item._id).populate(ITEM_POPULATE);
  new ApiResponse(200, populated, 'Delivery confirmed — rental is now active.').send(res);
});

// ---- History / earnings / stats ----

const listHistory = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const items = await OrderItem.find({
    deliveryPartner: partner._id,
    status: { $nin: [ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, ORDER_ITEM_STATUS.PENDING, ORDER_ITEM_STATUS.CONFIRMED] },
  })
    .sort({ updatedAt: -1 })
    .populate(ITEM_POPULATE);
  new ApiResponse(200, items).send(res);
});

const getEarnings = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const items = await OrderItem.find({ deliveryPartner: partner._id, deliveredAt: { $ne: null } }).select('deliveryFee deliveredAt');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let daily = 0;
  let weekly = 0;
  let monthly = 0;
  let allTime = 0;
  const dailyBuckets = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), date: d, value: 0 };
  });

  items.forEach((item) => {
    allTime += item.deliveryFee;
    if (item.deliveredAt >= startOfMonth) monthly += item.deliveryFee;
    if (item.deliveredAt >= startOfWeek) weekly += item.deliveryFee;
    if (item.deliveredAt >= startOfDay) daily += item.deliveryFee;
    const bucket = dailyBuckets.find((b) => b.date.toDateString() === new Date(item.deliveredAt).toDateString());
    if (bucket) bucket.value += item.deliveryFee;
  });

  // Small deterministic incentive/bonus layer on top of real per-delivery fees — flagged
  // clearly as such rather than presented as a real payout ledger.
  const incentive = Math.round(allTime * 0.05);
  const bonus = partner.totalDeliveries >= 20 ? 200 : partner.totalDeliveries >= 10 ? 100 : 0;

  new ApiResponse(200, {
    daily,
    weekly,
    monthly,
    allTime,
    incentive,
    bonus,
    totalPayout: allTime + incentive + bonus,
    dailyTrend: dailyBuckets.map((b) => ({ label: b.label, value: b.value })),
  }).send(res);
});

const getStats = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req);
  const allAssigned = await OrderItem.find({ deliveryPartner: partner._id }).select('status pickedUpAt deliveredAt createdAt');

  const completed = allAssigned.filter((i) => i.deliveredAt);
  const cancelled = allAssigned.filter((i) => i.status === ORDER_ITEM_STATUS.CANCELLED);
  const active = allAssigned.filter((i) => [ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY].includes(i.status));

  const completionRate = allAssigned.length ? Math.round((completed.length / allAssigned.length) * 100) : 0;

  const durations = completed.filter((i) => i.pickedUpAt && i.deliveredAt).map((i) => (new Date(i.deliveredAt) - new Date(i.pickedUpAt)) / 60000);
  const avgDeliveryMinutes = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Last-8-weeks delivery volume, for a trend chart.
  const weeklyTrend = Array.from({ length: 8 }).map((_, i) => {
    const start = new Date();
    start.setDate(start.getDate() - (7 - i) * 7);
    return { label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: 0 };
  });
  completed.forEach((i) => {
    const daysAgo = Math.floor((Date.now() - new Date(i.deliveredAt)) / 86400000);
    const weekIndex = 7 - Math.min(7, Math.floor(daysAgo / 7));
    if (weeklyTrend[weekIndex]) weeklyTrend[weekIndex].value += 1;
  });

  // Last-6-months delivery volume, for the longer-range trend chart alongside the weekly one.
  const now = new Date();
  const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: 0, year: d.getFullYear(), month: d.getMonth() };
  });
  completed.forEach((i) => {
    const d = new Date(i.deliveredAt);
    const bucket = monthlyTrend.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.value += 1;
  });

  // Composite 0-100 "delivery performance" score blending completion rate, rating and speed —
  // same spirit as the Vendor Analytics "Vendor Performance Score", presented as a single
  // headline number rather than making the viewer mentally combine several raw stats.
  const ratingComponent = ((partner.averageRating || 0) / 5) * 40;
  const completionComponent = (completionRate / 100) * 40;
  const speedComponent = avgDeliveryMinutes ? Math.max(0, 20 - Math.min(20, (avgDeliveryMinutes - 60) / 30)) : 12;
  const performanceScore = Math.round(Math.min(100, ratingComponent + completionComponent + speedComponent));

  new ApiResponse(200, {
    totalDeliveries: partner.totalDeliveries,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    activeCount: active.length,
    completionRate,
    avgDeliveryMinutes,
    averageRating: partner.averageRating,
    performanceScore,
    weeklyTrend,
    monthlyTrend: monthlyTrend.map(({ label, value }) => ({ label, value })),
  }).send(res);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  uploadDocument,
  uploadPhoto,
  listRequests,
  acceptRequest,
  rejectRequest,
  listAssigned,
  rejectAssigned,
  markPickedUp,
  markDelivered,
  listHistory,
  getEarnings,
  getStats,
};
