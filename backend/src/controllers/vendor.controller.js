const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const OrderItem = require('../models/OrderItem');
const DeliveryPartner = require('../models/DeliveryPartner');
const RentalRequestDecision = require('../models/RentalRequestDecision');
const { buildFileUrl } = require('../utils/fileUrl');
const { ORDER_ITEM_STATUS } = require('../constants/orderStatus');

// $match (unlike .find()) does not auto-cast string ids to ObjectId, so every aggregation
// pipeline filtering on a city id passed in via req.query needs this explicit cast.
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const POPULATE = [
  { path: 'user', select: 'name email phone avatar createdAt' },
  { path: 'city', select: 'name state' },
  { path: 'operatingCities', select: 'name state' },
];

const getMyProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id }).populate(POPULATE);

  if (!vendor) throw ApiError.notFound('Vendor profile not found.');
  new ApiResponse(200, vendor).send(res);
});

const EDITABLE_FIELDS = ['businessName', 'gstNumber', 'panNumber', 'businessAddress', 'description', 'city', 'operatingCities'];

const updateMyProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  });
  if (req.body.warehouseLocation) {
    vendor.warehouseLocation = { ...vendor.warehouseLocation.toObject(), ...req.body.warehouseLocation };
  }
  if (req.body.bankDetails) {
    vendor.bankDetails = { ...vendor.bankDetails.toObject(), ...req.body.bankDetails };
  }

  await vendor.save();
  const populated = await Vendor.findById(vendor._id).populate(POPULATE);
  new ApiResponse(200, populated, 'Profile updated.').send(res);
});

const IMAGE_FIELDS = ['profilePhoto', 'coverImage', 'logo'];

// One endpoint for all three vendor image slots (?type=profilePhoto|coverImage|logo) rather
// than three near-identical upload routes.
const uploadImage = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');
  if (!req.file) throw ApiError.badRequest('No file uploaded.');

  const type = req.query.type;
  if (!IMAGE_FIELDS.includes(type)) throw ApiError.badRequest(`type must be one of: ${IMAGE_FIELDS.join(', ')}.`);

  vendor[type] = buildFileUrl(req, req.file);
  await vendor.save();
  const populated = await Vendor.findById(vendor._id).populate(POPULATE);
  new ApiResponse(200, populated, 'Image updated.').send(res);
});

// Real aggregates over the vendor's own catalog (stock, categories, pricing, discounts) —
// genuinely computed from live Product documents, not synthesized, even though the demo
// vendor's underlying catalog rows are seed data.
const getMyStats = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  // Optional city scope — a vendor's own storefront-selected city (via the same CitySelector
  // every other portal uses). Vendors with `operatingCities` can genuinely have products in
  // more than one city, so this narrows every stat to just that city's slice of the catalog;
  // omitted entirely (no city selected) means "across every city this vendor operates in".
  const { city } = req.query;
  const cityMatch = city ? { city: toObjectId(city) } : {};

  const [summary, bySubCategory, lowStock] = await Promise.all([
    Product.aggregate([
      { $match: { vendor: vendor._id, ...cityMatch } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          averagePrice: { $avg: '$monthlyRentalPrice' },
          averageRating: { $avg: '$averageRating' },
          totalUnitsRented: { $sum: '$unitsRented' },
          discountedCount: { $sum: { $cond: [{ $gt: ['$discountPercent', 0] }, 1, 0] } },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
    ]),
    Product.aggregate([
      { $match: { vendor: vendor._id, ...cityMatch } },
      { $group: { _id: '$subCategory', count: { $sum: 1 }, totalStock: { $sum: '$stock' } } },
      { $sort: { count: -1 } },
    ]),
    Product.countDocuments({ vendor: vendor._id, ...cityMatch, stock: { $lte: 2 } }),
  ]);

  const totals = summary[0] || {
    totalProducts: 0,
    totalStock: 0,
    averagePrice: 0,
    averageRating: 0,
    totalUnitsRented: 0,
    discountedCount: 0,
    activeCount: 0,
  };

  new ApiResponse(200, {
    ...totals,
    lowStockCount: lowStock,
    bySubCategory,
  }).send(res);
});

const ACTIVE_DELIVERY_STATUSES = [ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY];

// Every OrderItem this vendor+partner pair ever shared, enriched into the performance/review
// shape the Delivery Partner Management screen needs — shared by both endpoints below so the
// per-partner numbers and the fleet-wide leaderboard are always computed the same way.
async function buildPartnerPerformance(vendorId, partnerId) {
  const items = await OrderItem.find({ vendor: vendorId, deliveryPartner: partnerId })
    .select('status deliveryFee pickedUpAt deliveredAt deliveryRating deliveryReviewComment deliveryReviewDate product order createdAt')
    .populate('product', 'name images')
    .populate({ path: 'order', select: 'customer orderNumber placedAt deliveryAddress', populate: { path: 'customer', select: 'name' } })
    .sort({ createdAt: -1 });

  const rejectedRequests = await OrderItem.countDocuments({ vendor: vendorId, rejectedByDeliveryPartners: partnerId });

  const completed = items.filter((i) => i.deliveredAt);
  const active = items.filter((i) => ACTIVE_DELIVERY_STATUSES.includes(i.status));
  const cancelled = items.filter((i) => i.status === ORDER_ITEM_STATUS.CANCELLED);
  const acceptedRequests = items.length; // every item here was, by definition, accepted by this partner
  const totalEarnings = items.reduce((sum, i) => sum + (i.deliveryFee || 0), 0);
  const successRate = acceptedRequests ? Math.round((completed.length / acceptedRequests) * 100) : 0;
  const cancellationRate = acceptedRequests ? Math.round((cancelled.length / acceptedRequests) * 100) : 0;

  const durations = completed.filter((i) => i.pickedUpAt).map((i) => (new Date(i.deliveredAt) - new Date(i.pickedUpAt)) / 60000);
  const avgDeliveryMinutes = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const reviews = completed
    .filter((i) => i.deliveryRating)
    .sort((a, b) => new Date(b.deliveryReviewDate) - new Date(a.deliveryReviewDate))
    .map((i) => ({
      orderItemId: i._id,
      customerName: i.order?.customer?.name || 'Customer',
      productName: i.product?.name || 'Product',
      rating: i.deliveryRating,
      comment: i.deliveryReviewComment,
      date: i.deliveryReviewDate,
    }));
  const customerRating = reviews.length ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)) : null;

  const orders = items.map((i) => ({
    orderItemId: i._id,
    orderNumber: i.order?.orderNumber,
    productName: i.product?.name,
    productImage: i.product?.images?.[0] || null,
    customerName: i.order?.customer?.name || 'Customer',
    status: i.status,
    deliveryDate: i.deliveredAt,
    deliveryTime: i.deliveredAt ? new Date(i.deliveredAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null,
    rating: i.deliveryRating,
    review: i.deliveryReviewComment,
  }));

  // "Last delivered X" — the single most-recently-*delivered* item, not just the most recently
  // *created* one (`items` above is sorted by createdAt, which can put a still-in-progress
  // order ahead of an older-but-already-completed one). Auto-refreshes on its own every time a
  // new delivery completes, since it's derived fresh from OrderItem on every read rather than
  // stored anywhere — there is no separate "profile" document to remember to update.
  const mostRecentDelivery = [...completed].sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))[0] || null;
  const lastDelivery = mostRecentDelivery
    ? {
        product: mostRecentDelivery.product?.name || null,
        productImage: mostRecentDelivery.product?.images?.[0] || null,
        customer: mostRecentDelivery.order?.customer?.name || null,
        city: mostRecentDelivery.order?.deliveryAddress?.city || null,
        date: mostRecentDelivery.deliveredAt,
        orderNumber: mostRecentDelivery.order?.orderNumber || null,
      }
    : null;

  return {
    productsDelivered: completed.length,
    // Same number as productsDelivered, named to match "delivery history count" as its own
    // concept — every completed delivery becomes exactly one Delivery History entry for this
    // vendor+partner pair, so the two are always equal by construction, not coincidence.
    deliveryHistoryCount: completed.length,
    lastDelivery,
    successRate,
    customerRating,
    acceptedRequests,
    rejectedRequests,
    pendingDeliveries: active.length,
    activeDeliveries: active.length,
    cancelledDeliveries: cancelled.length,
    cancellationRate,
    totalEarnings,
    avgDeliveryMinutes,
    reviews: reviews.slice(0, 8),
    orders,
  };
}

// Every delivery partner who has handled at least one of this vendor's orders, topped up with
// other existing platform partners (if fewer than FLEET_TOPUP_TARGET) so the screen always has
// a meaningful fleet to show — a brand-new vendor with zero real deliveries yet still sees the
// platform's available delivery partners rather than an empty page.
//
// `cityId`, when provided, is applied to BOTH the real-activity query and the topup filler —
// without it, the topup pool used to draw from every delivery partner on the entire platform
// regardless of city, which is exactly why every city looked identical: a vendor's real
// per-city activity is usually a handful of partners at most, so the city-agnostic topup pool
// dominated the result almost everywhere.
const FLEET_TOPUP_TARGET = 15;

async function getPartnerFleet(vendorId, cityId) {
  const activePartnerIds = await OrderItem.distinct('deliveryPartner', { vendor: vendorId, deliveryPartner: { $ne: null } });
  const cityMatch = cityId ? { assignedCity: cityId } : {};

  let partners = await DeliveryPartner.find({ _id: { $in: activePartnerIds }, ...cityMatch })
    .populate('user', 'name email phone avatar')
    .populate('assignedCity', 'name state');

  if (partners.length < FLEET_TOPUP_TARGET) {
    const excludeIds = partners.map((p) => p._id);
    // Newest-first: a delivery partner who just registered has, by definition, the most
    // recent `createdAt` of anyone in the collection, so sorting this way guarantees they
    // appear in the fleet immediately (previously unsorted `find()` gave no such guarantee —
    // a newly-registered partner could be silently excluded from the topup slice depending on
    // MongoDB's natural storage order, which is exactly the "doesn't show up" bug this fixes).
    const filler = await DeliveryPartner.find({ _id: { $nin: excludeIds }, ...cityMatch })
      .sort({ createdAt: -1 })
      .limit(FLEET_TOPUP_TARGET - partners.length)
      .populate('user', 'name email phone avatar')
      .populate('assignedCity', 'name state');
    partners = [...partners, ...filler];
  }

  return partners;
}

const listDeliveryPartners = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  const partners = await getPartnerFleet(vendor._id, req.query.city || null);
  const withPerformance = await Promise.all(
    partners.map(async (partner) => ({
      _id: partner._id,
      user: partner.user,
      assignedCity: partner.assignedCity,
      vehicleType: partner.vehicleType,
      vehicleNumber: partner.vehicleNumber,
      isAvailable: partner.isAvailable,
      isOnline: partner.isOnline,
      averageRating: partner.averageRating,
      totalDeliveries: partner.totalDeliveries,
      profilePhoto: partner.profilePhoto,
      joinedAt: partner.createdAt,
      performance: await buildPartnerPerformance(vendor._id, partner._id),
    }))
  );

  new ApiResponse(200, withPerformance).send(res);
});

const getDeliveryAnalytics = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  const partners = await getPartnerFleet(vendor._id, req.query.city || null);
  const withPerformance = await Promise.all(
    partners.map(async (partner) => ({
      partnerId: partner._id,
      name: partner.user?.name,
      phone: partner.user?.phone,
      performance: await buildPartnerPerformance(vendor._id, partner._id),
    }))
  );

  // Flat "which delivery partner delivered which order" table across the whole fleet.
  const orders = withPerformance.flatMap((p) =>
    p.performance.orders.map((o) => ({ ...o, deliveryPartnerName: p.name, deliveryPartnerPhone: p.phone }))
  );

  const withDeliveries = withPerformance.filter((p) => p.performance.productsDelivered > 0);
  const byMetric = (metric, dir = -1) =>
    [...withDeliveries].sort((a, b) => dir * (a.performance[metric] - b.performance[metric]))[0] || null;
  const byMetricAsc = (metric) => {
    const eligible = withDeliveries.filter((p) => p.performance[metric] > 0);
    return eligible.length ? eligible.sort((a, b) => a.performance[metric] - b.performance[metric])[0] : null;
  };
  const toLeaderEntry = (p) => (p ? { partnerId: p.partnerId, name: p.name, value: p.performance } : null);

  const leaderboard = {
    topPerforming: toLeaderEntry(byMetric('successRate')),
    fastest: toLeaderEntry(byMetricAsc('avgDeliveryMinutes')),
    highestRated: toLeaderEntry([...withDeliveries].sort((a, b) => (b.performance.customerRating || 0) - (a.performance.customerRating || 0))[0]),
    mostDeliveries: toLeaderEntry(byMetric('productsDelivered')),
    lowestCancellation: toLeaderEntry([...withPerformance].sort((a, b) => a.performance.cancellationRate - b.performance.cancellationRate)[0]),
  };

  new ApiResponse(200, {
    orders: orders.sort((a, b) => new Date(b.deliveryDate || 0) - new Date(a.deliveryDate || 0)),
    leaderboard,
    fleetSize: partners.length,
  }).send(res);
});

// Rental Requests (frontend/lib/mockVendorData.js's buildRentalRequests) are demo data
// synthesized client-side from the vendor's real catalog — there's no real "customer requests a
// rental before ordering" flow in this app, so there's no request document to fetch by id here.
// What IS real: whether THIS vendor has already recorded an Approve/Decline decision for a given
// request id, which is exactly what these two endpoints expose/persist.
const listRentalRequestDecisions = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  const decisions = await RentalRequestDecision.find({ vendor: vendor._id }).select('requestId status -_id');
  const byRequestId = Object.fromEntries(decisions.map((d) => [d.requestId, d.status]));
  new ApiResponse(200, byRequestId).send(res);
});

const decideRentalRequest = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  const { requestId } = req.params;
  const { action } = req.body;
  if (!['approve', 'decline'].includes(action)) throw ApiError.badRequest('action must be "approve" or "decline".');
  const status = action === 'approve' ? 'approved' : 'declined';

  const existing = await RentalRequestDecision.findOne({ vendor: vendor._id, requestId });
  if (existing) throw ApiError.conflict(`This request was already ${existing.status}.`);

  // The unique (vendor, requestId) index is still the real guard against a race between two
  // concurrent requests for the same id — this findOne is just what turns that into a clean,
  // specific error message instead of a raw duplicate-key exception reaching the client.
  try {
    const decision = await RentalRequestDecision.create({ vendor: vendor._id, requestId, status });
    new ApiResponse(200, decision, `Rental request ${status}.`).send(res);
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('This request was already decided.');
    throw err;
  }
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadImage,
  getMyStats,
  listDeliveryPartners,
  getDeliveryAnalytics,
  listRentalRequestDecisions,
  decideRentalRequest,
};
