const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const { generateInventoryAssets } = require('../utils/inventoryAssets');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const InventoryItem = require('../models/InventoryItem');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const RentalPlan = require('../models/RentalPlan');
const Notification = require('../models/Notification');
const PlatformSettings = require('../models/PlatformSettings');
const City = require('../models/City');
const Address = require('../models/Address');
const notificationService = require('../services/notificationService');
const { generateVendorDemoData } = require('../services/vendorOnboardingService');
const { VENDOR_STATUS } = require('../constants/inventoryStatus');
const { ROLES } = require('../constants/roles');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS } = require('../constants/orderStatus');

const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// $match (unlike .find()) does not auto-cast string ids to ObjectId, so every aggregation
// pipeline that filters on a city id passed in via req.query needs this explicitly.
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// City-wise data isolation: OrderItem/Payment don't carry a city field of their own (the order
// they belong to does), so scoping either by city means first resolving which Orders were
// placed in that city, then filtering on `order: { $in: orderIds }`. Centralized here so every
// endpoint below resolves it the exact same way.
async function orderIdsForCity(cityId) {
  if (!cityId) return null;
  const orders = await Order.find({ city: toObjectId(cityId) }).select('_id');
  return orders.map((o) => o._id);
}

// ============================================================================
// Vendor management (existing)
// ============================================================================

// Products Count / Active Rentals / Revenue per vendor — shown on both the list and detail
// views (distinct from getVendorPerformance below, which is a richer single-vendor breakdown
// for the dedicated Performance screen).
async function vendorStatsById(vendorIds) {
  if (!vendorIds.length) return {};
  const [productCounts, itemStats] = await Promise.all([
    Product.aggregate([{ $match: { vendor: { $in: vendorIds } } }, { $group: { _id: '$vendor', count: { $sum: 1 } } }]),
    OrderItem.aggregate([
      { $match: { vendor: { $in: vendorIds } } },
      {
        $group: {
          _id: '$vendor',
          activeRentals: { $sum: { $cond: [{ $eq: ['$status', ORDER_ITEM_STATUS.ACTIVE_RENTAL] }, 1, 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$status', [ORDER_ITEM_STATUS.ACTIVE_RENTAL, ORDER_ITEM_STATUS.COMPLETED, ORDER_ITEM_STATUS.RETURNED]] },
                '$monthlyRentalPrice',
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);
  const productsById = Object.fromEntries(productCounts.map((p) => [String(p._id), p.count]));
  const itemsById = Object.fromEntries(itemStats.map((s) => [String(s._id), s]));
  const out = {};
  vendorIds.forEach((id) => {
    const key = String(id);
    out[key] = {
      productsCount: productsById[key] || 0,
      activeRentals: itemsById[key]?.activeRentals || 0,
      revenue: itemsById[key]?.revenue || 0,
    };
  });
  return out;
}

const listVendors = asyncHandler(async (req, res) => {
  const { status, city, search } = req.query;
  const filter = {};
  if (status && Object.values(VENDOR_STATUS).includes(status)) filter.status = status;
  if (city) filter.city = city;

  let vendors = await Vendor.find(filter)
    .populate('user', 'name email phone createdAt')
    .populate('city', 'name state')
    .sort({ createdAt: -1 });

  // Filtered in memory (not a $lookup+$match aggregation) since businessName lives on Vendor
  // but name/email live on the populated User — this app's vendor counts are small (tens, not
  // thousands), so this stays fast without the added complexity of a join-based search.
  if (search) {
    const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    vendors = vendors.filter((v) => regex.test(v.businessName) || regex.test(v.user?.name || '') || regex.test(v.user?.email || ''));
  }

  const statsById = await vendorStatsById(vendors.map((v) => v._id));
  const withStats = vendors.map((v) => ({ ...v.toObject(), ...statsById[String(v._id)] }));

  new ApiResponse(200, withStats).send(res);
});

const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate('user', 'name email phone createdAt isActive')
    .populate('city', 'name state')
    .populate('approvedBy', 'name email');

  if (!vendor) throw ApiError.notFound('Vendor not found.');
  const statsById = await vendorStatsById([vendor._id]);
  new ApiResponse(200, { ...vendor.toObject(), ...statsById[String(vendor._id)] }).send(res);
});

const adminUpdateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found.');

  const allowedFields = ['businessName', 'gstNumber', 'panNumber', 'businessAddress', 'area', 'description'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  });
  if (req.body.city) vendor.city = req.body.city;
  await vendor.save();

  const populated = await Vendor.findById(vendor._id).populate('user', 'name email phone').populate('city', 'name state');
  new ApiResponse(200, populated, 'Vendor updated successfully.').send(res);
});

const adminDeleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found.');

  // No cascade-delete of historical Products/Orders/Payments — that would corrupt real
  // transaction history other records still reference. Instead: delist their catalog (mirrors
  // how a suspended vendor's products already behave) and deactivate their login (isActive is
  // checked before any role-specific login logic, so this alone fully blocks access).
  await Product.updateMany({ vendor: vendor._id }, { $set: { isActive: false } });
  await User.findByIdAndUpdate(vendor.user, { $set: { isActive: false } });
  await vendor.deleteOne();

  new ApiResponse(200, null, 'Vendor deleted successfully.').send(res);
});

const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate('user', 'name email');
  if (!vendor) throw ApiError.notFound('Vendor not found.');

  vendor.status = VENDOR_STATUS.APPROVED;
  vendor.approvedBy = req.user._id;
  vendor.approvedAt = new Date();
  vendor.rejectionReason = '';
  await vendor.save();

  // Give this vendor its own real, independent-looking business the moment it goes live —
  // own product catalog, own order history, own notifications — never Demo Vendor's data and
  // never an empty dashboard. Awaited so the approval only reports success once the new
  // vendor's account is actually ready to use; failures here shouldn't block the approval
  // itself (the vendor is still validly approved even if demo-data generation has an issue).
  // Most vendors are already auto-approved at registration now, so this mainly matters for
  // the seeded sample pending applications an Admin approves by hand — guarded internally
  // against duplicate generation either way.
  try {
    await generateVendorDemoData(vendor);
  } catch (err) {
    logger.error(`Vendor onboarding data generation failed for ${vendor.businessName}: ${err.message}`);
  }

  await notificationService.sendEmail({
    to: vendor.user.email,
    subject: 'Your RentEase vendor application has been approved',
    html: `<p>Hi ${vendor.user.name},</p><p>Great news — your vendor application for <strong>${vendor.businessName}</strong> has been approved. You can now log in and start listing inventory.</p>`,
    text: `Your vendor application for ${vendor.businessName} has been approved. You can now log in.`,
  });

  new ApiResponse(200, vendor, 'Vendor approved successfully.').send(res);
});

const rejectVendor = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const vendor = await Vendor.findById(req.params.id).populate('user', 'name email');
  if (!vendor) throw ApiError.notFound('Vendor not found.');

  vendor.status = VENDOR_STATUS.REJECTED;
  vendor.rejectionReason = reason || 'Application did not meet marketplace requirements.';
  vendor.approvedBy = req.user._id;
  vendor.approvedAt = new Date();
  await vendor.save();

  await notificationService.sendEmail({
    to: vendor.user.email,
    subject: 'Update on your RentEase vendor application',
    html: `<p>Hi ${vendor.user.name},</p><p>Your vendor application for <strong>${vendor.businessName}</strong> was not approved.</p><p>Reason: ${vendor.rejectionReason}</p>`,
    text: `Your vendor application for ${vendor.businessName} was not approved. Reason: ${vendor.rejectionReason}`,
  });

  new ApiResponse(200, vendor, 'Vendor application rejected.').send(res);
});

const suspendVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found.');

  vendor.status = VENDOR_STATUS.SUSPENDED;
  await vendor.save();
  new ApiResponse(200, vendor, 'Vendor suspended.').send(res);
});

// Lifts a suspension (or reverses a rejection) back to APPROVED — the vendor can log in and
// trade again immediately (assertUserCanLogin only blocks PENDING/REJECTED/SUSPENDED, so
// flipping straight to APPROVED is the entire fix). Re-runs generateVendorDemoData too, guarded
// internally against duplicating an existing catalog, so a vendor that was suspended before
// ever getting real data (e.g. suspended moments after a manual pending->approved flip) still
// ends up with one on reactivation.
const reactivateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate('user', 'name email');
  if (!vendor) throw ApiError.notFound('Vendor not found.');
  if (vendor.status !== VENDOR_STATUS.SUSPENDED && vendor.status !== VENDOR_STATUS.REJECTED) {
    throw ApiError.badRequest('Only a suspended or rejected vendor can be reactivated.');
  }

  vendor.status = VENDOR_STATUS.APPROVED;
  vendor.approvedBy = req.user._id;
  vendor.approvedAt = new Date();
  vendor.rejectionReason = '';
  await vendor.save();

  try {
    await generateVendorDemoData(vendor);
  } catch (err) {
    logger.error(`Vendor onboarding data generation failed for ${vendor.businessName}: ${err.message}`);
  }

  await notificationService.sendEmail({
    to: vendor.user.email,
    subject: 'Your RentEase vendor account has been reactivated',
    html: `<p>Hi ${vendor.user.name},</p><p>Your vendor account for <strong>${vendor.businessName}</strong> has been reactivated. You can log in and resume trading immediately.</p>`,
    text: `Your vendor account for ${vendor.businessName} has been reactivated. You can log in now.`,
  });

  new ApiResponse(200, vendor, 'Vendor reactivated successfully.').send(res);
});

// Real aggregates over one vendor's own catalog + orders — the admin-facing equivalent of
// vendor.controller.js's getMyStats/getDeliveryAnalytics, for the "Vendor Performance" view.
const getVendorPerformance = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found.');

  const [productStats, orderStats, revenueAgg] = await Promise.all([
    Product.aggregate([
      { $match: { vendor: vendor._id } },
      { $group: { _id: null, totalProducts: { $sum: 1 }, totalStock: { $sum: '$stock' }, averageRating: { $avg: '$averageRating' } } },
    ]),
    OrderItem.aggregate([
      { $match: { vendor: vendor._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    OrderItem.aggregate([
      { $match: { vendor: vendor._id, status: { $in: [ORDER_ITEM_STATUS.ACTIVE_RENTAL, ORDER_ITEM_STATUS.COMPLETED] } } },
      { $group: { _id: null, revenue: { $sum: '$monthlyRentalPrice' } } },
    ]),
  ]);

  new ApiResponse(200, {
    vendorId: vendor._id,
    businessName: vendor.businessName,
    totalProducts: productStats[0]?.totalProducts || 0,
    totalStock: productStats[0]?.totalStock || 0,
    averageRating: Number((productStats[0]?.averageRating || 0).toFixed(1)),
    ordersByStatus: Object.fromEntries(orderStats.map((s) => [s._id, s.count])),
    totalOrders: orderStats.reduce((sum, s) => sum + s.count, 0),
    totalRevenue: revenueAgg[0]?.revenue || 0,
  }).send(res);
});

// ============================================================================
// Platform dashboard stats
// ============================================================================

const getDashboardStats = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const cityId = city ? toObjectId(city) : null;
  const orderIds = city ? await orderIdsForCity(city) : null;
  // Admin headcount is deliberately never city-scoped — Admins manage the whole platform, not
  // one city's slice of it, so this number stays the same regardless of the selected city.
  const vendorCityMatch = cityId ? { city: cityId } : {};
  const partnerCityMatch = cityId ? { assignedCity: cityId } : {};
  const customerCityMatch = cityId ? { selectedCity: cityId } : {};
  const productCityMatch = cityId ? { city: cityId } : {};
  const orderScopedMatch = city ? { order: { $in: orderIds } } : {};

  const [
    pendingVendors,
    approvedVendors,
    rejectedVendors,
    suspendedVendors,
    totalCustomers,
    totalVendors,
    totalDeliveryPartners,
    totalAdmins,
    totalProducts,
    totalOrders,
    pendingOrders,
    activeRentals,
    revenueAgg,
  ] = await Promise.all([
    Vendor.countDocuments({ ...vendorCityMatch, status: VENDOR_STATUS.PENDING }),
    Vendor.countDocuments({ ...vendorCityMatch, status: VENDOR_STATUS.APPROVED }),
    Vendor.countDocuments({ ...vendorCityMatch, status: VENDOR_STATUS.REJECTED }),
    Vendor.countDocuments({ ...vendorCityMatch, status: VENDOR_STATUS.SUSPENDED }),
    User.countDocuments({ role: ROLES.CUSTOMER, ...customerCityMatch }),
    Vendor.countDocuments(vendorCityMatch),
    DeliveryPartner.countDocuments(partnerCityMatch),
    User.countDocuments({ role: ROLES.ADMIN }),
    Product.countDocuments({ ...productCityMatch, isActive: true }),
    city ? Order.countDocuments({ city: cityId }) : Order.countDocuments({}),
    OrderItem.countDocuments({ ...orderScopedMatch, status: ORDER_ITEM_STATUS.PENDING }),
    OrderItem.countDocuments({ ...orderScopedMatch, status: ORDER_ITEM_STATUS.ACTIVE_RENTAL }),
    Payment.aggregate([{ $match: { ...orderScopedMatch, status: PAYMENT_STATUS.PAID } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  new ApiResponse(200, {
    pendingVendors,
    approvedVendors,
    rejectedVendors,
    suspendedVendors,
    totalCustomers,
    totalVendors,
    totalDeliveryPartners,
    totalAdmins,
    totalUsers: totalCustomers + totalVendors + totalDeliveryPartners + totalAdmins,
    totalProducts,
    totalOrders,
    pendingOrders,
    activeRentals,
    totalRevenue: revenueAgg[0]?.total || 0,
  }).send(res);
});

// ============================================================================
// Product management — the platform catalog's admin-authored side. Products created here are
// vendor: null / isRentEaseOwned: true, exactly like the seeded "RentEase-owned" ~1/3 of the
// demo catalog, so they show up in Customer Browse/Search/Rental Listings through the exact
// same public /products endpoint everyone else's catalog already goes through — no separate
// "admin catalog" to keep in sync.
// ============================================================================

const adminListProducts = asyncHandler(async (req, res) => {
  const { category, city, vendor, isActive, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (city) filter.city = city;
  if (vendor) filter.vendor = vendor;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { brand: regex }, { sku: regex }];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('vendor', 'businessName')
      .populate('city', 'name state')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  new ApiResponse(200, { items, total, page: pageNum, limit: limitNum, pages: Math.max(1, Math.ceil(total / limitNum)) }).send(res);
});

const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug').populate('vendor', 'businessName').populate('city', 'name state');
  if (!product) throw ApiError.notFound('Product not found.');
  new ApiResponse(200, product).send(res);
});

const adminCreateProduct = asyncHandler(async (req, res) => {
  const body = req.body;

  const existingSku = await Product.findOne({ sku: body.sku });
  if (existingSku) throw ApiError.conflict('A product with this SKU already exists.');

  const product = await Product.create({
    ...body,
    vendor: body.vendor || null,
    isRentEaseOwned: !body.vendor,
    availabilityStatus: 'active',
    isActive: true,
  });

  // One real serialized unit with a genuine QR code + barcode, same as every other product in
  // this app (seed.js / vendorOnboardingService.js) — never a placeholder image.
  const assets = await generateInventoryAssets(product.sku);
  await InventoryItem.create({
    product: product._id,
    serialNumber: assets.serialNumber,
    qrCodeUrl: assets.qrCodeUrl,
    barcodeUrl: assets.barcodeUrl,
    city: product.city,
    purchaseDate: new Date(),
  });

  const populated = await Product.findById(product._id).populate('category', 'name slug').populate('city', 'name state');
  new ApiResponse(201, populated, 'Product created successfully.').send(res);
});

const adminUpdateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  if (req.body.sku && req.body.sku !== product.sku) {
    const dupe = await Product.findOne({ sku: req.body.sku, _id: { $ne: product._id } });
    if (dupe) throw ApiError.conflict('Another product already uses this SKU.');
  }

  Object.assign(product, req.body);
  await product.save();

  const populated = await Product.findById(product._id).populate('category', 'name slug').populate('vendor', 'businessName').populate('city', 'name state');
  new ApiResponse(200, populated, 'Product updated successfully.').send(res);
});

// A dedicated, clearly-named action for the "Product Approval" screen — functionally just an
// isActive/availabilityStatus toggle (same fields adminUpdateProduct can already set), kept as
// its own endpoint so the frontend's Approve/Reject buttons don't need to reconstruct a full
// product-edit payload just to flip one flag.
const adminSetProductApproval = asyncHandler(async (req, res) => {
  const { approved } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  product.isActive = Boolean(approved);
  product.availabilityStatus = approved ? 'active' : 'inactive';
  await product.save();

  new ApiResponse(200, product, approved ? 'Product approved and listed.' : 'Product unlisted.').send(res);
});

const adminDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  await InventoryItem.deleteMany({ product: product._id });
  await product.deleteOne();

  new ApiResponse(200, null, 'Product deleted.').send(res);
});

// ============================================================================
// Category management
// ============================================================================

const adminListCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ name: 1 });
  const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const countByCategory = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  new ApiResponse(
    200,
    categories.map((c) => ({ ...c.toObject(), productCount: countByCategory[String(c._id)] || 0 }))
  ).send(res);
});

const adminCreateCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, isActive } = req.body;
  const categorySlug = req.body.slug ? slug(req.body.slug) : slug(name);

  const existing = await Category.findOne({ $or: [{ name }, { slug: categorySlug }] });
  if (existing) throw ApiError.conflict('A category with this name or slug already exists.');

  const category = await Category.create({ name, slug: categorySlug, description, icon, isActive });
  new ApiResponse(201, category, 'Category created.').send(res);
});

const adminUpdateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');

  if (req.body.name) category.name = req.body.name;
  if (req.body.slug) category.slug = slug(req.body.slug);
  if (req.body.description !== undefined) category.description = req.body.description;
  if (req.body.icon !== undefined) category.icon = req.body.icon;
  if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
  await category.save();

  new ApiResponse(200, category, 'Category updated.').send(res);
});

const adminDeleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');

  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse > 0) throw ApiError.badRequest(`Cannot delete — ${inUse} product(s) still use this category. Reassign or delete them first.`);

  await category.deleteOne();
  new ApiResponse(200, null, 'Category deleted.').send(res);
});

// ============================================================================
// Inventory management — real aggregates over Product.stock / InventoryItem, not a synthetic
// per-vendor demo pipeline (this is platform-wide, so it's genuinely meaningful as real data).
// ============================================================================

const LOW_STOCK_THRESHOLD = 3;

const adminInventoryOverview = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const productMatch = city ? { city: toObjectId(city) } : {};
  const inventoryMatch = city ? { city: toObjectId(city) } : {};

  const [summary, byCity, lowStockProducts, inventoryByStatus] = await Promise.all([
    Product.aggregate([{ $match: productMatch }, { $group: { _id: null, totalProducts: { $sum: 1 }, totalStock: { $sum: '$stock' } } }]),
    Product.aggregate([
      { $match: productMatch },
      { $group: { _id: '$city', totalStock: { $sum: '$stock' }, productCount: { $sum: 1 } } },
      { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
      { $unwind: { path: '$city', preserveNullAndEmptyArrays: true } },
      { $project: { cityName: '$city.name', totalStock: 1, productCount: 1 } },
      { $sort: { totalStock: -1 } },
    ]),
    Product.find({ ...productMatch, stock: { $lte: LOW_STOCK_THRESHOLD }, isActive: true })
      .select('name sku stock brand city vendor')
      .populate('city', 'name')
      .populate('vendor', 'businessName')
      .sort({ stock: 1 })
      .limit(50),
    InventoryItem.aggregate([{ $match: inventoryMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  new ApiResponse(200, {
    totalProducts: summary[0]?.totalProducts || 0,
    totalStock: summary[0]?.totalStock || 0,
    lowStockCount: lowStockProducts.length,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    byCity,
    lowStockProducts,
    inventoryByStatus: Object.fromEntries(inventoryByStatus.map((s) => [s._id, s.count])),
  }).send(res);
});

// ============================================================================
// Customer management
// ============================================================================

// Shared by adminListCustomers/adminGetCustomer — resolves totalSpending (paid Payments),
// activeRentals/completedRentals/cancelledOrders (via each customer's Order -> OrderItem
// statuses) and their default saved Address, for a given set of customer ids. Computed with a
// handful of aggregations rather than N+1 queries per customer.
async function customerStatsById(customerIds) {
  if (!customerIds.length) return {};

  const [orders, spendingAgg, addresses] = await Promise.all([
    Order.find({ customer: { $in: customerIds } }).select('_id customer').lean(),
    Payment.aggregate([
      { $match: { user: { $in: customerIds }, status: PAYMENT_STATUS.PAID } },
      { $group: { _id: '$user', total: { $sum: '$amount' } } },
    ]),
    Address.find({ user: { $in: customerIds } }).select('user addressLine1 addressLine2 city state pincode isDefault').populate('city', 'name state').lean(),
  ]);

  const orderIdsByCustomer = {};
  const customerByOrderId = {};
  orders.forEach((o) => {
    const key = String(o.customer);
    (orderIdsByCustomer[key] = orderIdsByCustomer[key] || []).push(o._id);
    customerByOrderId[String(o._id)] = key;
  });

  const items = await OrderItem.find({ order: { $in: orders.map((o) => o._id) } }).select('order status').lean();
  const statsByCustomer = {};
  const ensure = (key) => (statsByCustomer[key] = statsByCustomer[key] || { totalOrders: 0, activeRentals: 0, completedRentals: 0, cancelledOrders: 0 });
  Object.keys(orderIdsByCustomer).forEach((key) => ensure(key));
  items.forEach((item) => {
    const key = customerByOrderId[String(item.order)];
    if (!key) return;
    const s = ensure(key);
    s.totalOrders += 1;
    if (item.status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) s.activeRentals += 1;
    else if ([ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED].includes(item.status)) s.completedRentals += 1;
    else if (item.status === ORDER_ITEM_STATUS.CANCELLED) s.cancelledOrders += 1;
  });

  const spendingByCustomer = Object.fromEntries(spendingAgg.map((s) => [String(s._id), s.total]));
  const addressByCustomer = Object.fromEntries(addresses.map((a) => [String(a.user), a]));

  const out = {};
  customerIds.forEach((id) => {
    const key = String(id);
    out[key] = {
      ...ensure(key),
      totalSpending: spendingByCustomer[key] || 0,
      address: addressByCustomer[key] || null,
    };
  });
  return out;
}

const CUSTOMER_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};

const adminListCustomers = asyncHandler(async (req, res) => {
  const { search, city, status, sort = 'newest', page = 1, limit = 20 } = req.query;
  const filter = { role: ROLES.CUSTOMER };
  // A customer isn't tied to a city the way a Vendor/DeliveryPartner is — `selectedCity` (their
  // current browsing city, the same field the storefront's city switcher writes to) is the only
  // geographic signal this app has for a customer, so it doubles as the admin city-scope proxy.
  if (city) filter.selectedCity = city;
  if (status === 'active') filter.isActive = true;
  else if (status === 'suspended') filter.isActive = false;
  if (search) {
    const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  // Demo-scale dataset (low hundreds of customers) — computing stats for the whole filtered set
  // before sorting/paginating in JS is simpler and correct; a spending/orders sort needs the
  // full set's numbers anyway, so there's no cheaper DB-only path once that sort is requested.
  const allMatching = await User.find(filter).select('name email phone avatar isActive createdAt lastLoginAt selectedCity').populate('selectedCity', 'name state').sort(CUSTOMER_SORTS[sort] || CUSTOMER_SORTS.newest).lean();
  const total = allMatching.length;

  const statsById = await customerStatsById(allMatching.map((u) => u._id));
  let withStats = allMatching.map((u) => ({ ...u, ...statsById[String(u._id)] }));

  if (sort === 'spending_desc') withStats = withStats.sort((a, b) => (b.totalSpending || 0) - (a.totalSpending || 0));
  else if (sort === 'orders_desc') withStats = withStats.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));

  const start = (pageNum - 1) * limitNum;
  const items = withStats.slice(start, start + limitNum);

  new ApiResponse(200, {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  }).send(res);
});

const adminGetCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: ROLES.CUSTOMER })
    .select('name email phone avatar isActive createdAt lastLoginAt selectedCity')
    .populate('selectedCity', 'name state');
  if (!customer) throw ApiError.notFound('Customer not found.');

  const [orders, addresses] = await Promise.all([
    Order.find({ customer: customer._id }).sort({ createdAt: -1 }).populate({ path: 'items', populate: { path: 'product', select: 'name images' } }),
    Address.find({ user: customer._id }).populate('city', 'name state'),
  ]);
  const allItems = orders.flatMap((o) => o.items);
  const activeRentals = allItems.filter((i) => i.status === ORDER_ITEM_STATUS.ACTIVE_RENTAL).length;
  const completedRentals = allItems.filter((i) => [ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED].includes(i.status)).length;
  const cancelledOrders = allItems.filter((i) => i.status === ORDER_ITEM_STATUS.CANCELLED).length;
  const totalSpendingAgg = await Payment.aggregate([
    { $match: { user: customer._id, status: PAYMENT_STATUS.PAID } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  new ApiResponse(200, {
    customer,
    orders,
    addresses,
    totalOrders: orders.length,
    activeRentals,
    completedRentals,
    cancelledOrders,
    totalSpending: totalSpendingAgg[0]?.total || 0,
  }).send(res);
});

// ============================================================================
// Delivery partner management — visibility + real status, not a manual-assignment tool: this
// app's delivery-partner-accepts-open-requests flow is the only assignment mechanism anywhere
// in the codebase (vendor and customer sides both work the same way), so Admin gets the same
// real, live status every other portal already computes rather than a second, disconnected
// "assign" button that would silently do nothing. Also has its own admin-managed approval
// lifecycle (DeliveryPartner.status), mirroring Vendor's.
// ============================================================================

async function deliveryPartnerCountsById(filterIds) {
  const match = filterIds ? { deliveryPartner: { $in: filterIds } } : { deliveryPartner: { $ne: null } };
  const [active, completed, pending, cancelled] = await Promise.all([
    OrderItem.aggregate([
      { $match: { ...match, status: { $in: [ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY] } } },
      { $group: { _id: '$deliveryPartner', count: { $sum: 1 } } },
    ]),
    OrderItem.aggregate([
      { $match: { ...match, deliveredAt: { $ne: null } } },
      { $group: { _id: '$deliveryPartner', count: { $sum: 1 } } },
    ]),
    // "Pending" from a delivery partner's own perspective: assigned to them but not yet picked
    // up (still awaiting action on their end), distinct from the platform-wide unassigned
    // PENDING order queue (which has no deliveryPartner at all).
    OrderItem.aggregate([
      { $match: { ...match, status: ORDER_ITEM_STATUS.CONFIRMED } },
      { $group: { _id: '$deliveryPartner', count: { $sum: 1 } } },
    ]),
    OrderItem.aggregate([
      { $match: { ...match, status: ORDER_ITEM_STATUS.CANCELLED } },
      { $group: { _id: '$deliveryPartner', count: { $sum: 1 } } },
    ]),
  ]);
  return {
    activeByPartner: Object.fromEntries(active.map((c) => [String(c._id), c.count])),
    completedByPartner: Object.fromEntries(completed.map((c) => [String(c._id), c.count])),
    pendingByPartner: Object.fromEntries(pending.map((c) => [String(c._id), c.count])),
    cancelledByPartner: Object.fromEntries(cancelled.map((c) => [String(c._id), c.count])),
  };
}

const adminListDeliveryPartners = asyncHandler(async (req, res) => {
  const { status, city, search } = req.query;
  const filter = {};
  if (status && Object.values(VENDOR_STATUS).includes(status)) filter.status = status;
  if (city) filter.assignedCity = city;

  let partners = await DeliveryPartner.find(filter)
    .populate('user', 'name email phone avatar isActive')
    .populate('assignedCity', 'name state')
    .sort({ createdAt: -1 });

  if (search) {
    const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    partners = partners.filter(
      (p) => regex.test(p.user?.name || '') || regex.test(p.user?.email || '') || regex.test(p.vehicleNumber || '')
    );
  }

  const { activeByPartner, completedByPartner, pendingByPartner, cancelledByPartner } = await deliveryPartnerCountsById(partners.map((p) => p._id));

  new ApiResponse(
    200,
    partners.map((p) => ({
      ...p.toObject(),
      activeDeliveries: activeByPartner[String(p._id)] || 0,
      completedDeliveries: completedByPartner[String(p._id)] || 0,
      pendingDeliveries: pendingByPartner[String(p._id)] || 0,
      cancelledDeliveries: cancelledByPartner[String(p._id)] || 0,
      // No complaint-filing system exists anywhere in this app yet (no customer-facing "report
      // an issue" flow) — this is a genuine 0, not a fabricated placeholder, and stays 0 until
      // that real feature exists rather than inventing fake complaint records.
      complaintsCount: 0,
    }))
  ).send(res);
});

const adminGetDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.params.id).populate('user', 'name email phone avatar isActive').populate('assignedCity', 'name state');
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  const [items, allItems] = await Promise.all([
    OrderItem.find({ deliveryPartner: partner._id })
      .select('status product deliveredAt deliveryFee deliveryRating deliveryReviewComment createdAt')
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .limit(50),
    OrderItem.find({ deliveryPartner: partner._id }).select('status deliveredAt deliveryRating'),
  ]);

  const completed = allItems.filter((i) => i.deliveredAt);
  const active = allItems.filter((i) => [ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY].includes(i.status));
  const pending = allItems.filter((i) => i.status === ORDER_ITEM_STATUS.CONFIRMED);
  const cancelled = allItems.filter((i) => i.status === ORDER_ITEM_STATUS.CANCELLED);
  const rated = completed.filter((i) => i.deliveryRating);
  const avgRating = rated.length ? Number((rated.reduce((s, i) => s + i.deliveryRating, 0) / rated.length).toFixed(1)) : partner.averageRating;

  new ApiResponse(200, {
    partner,
    recentDeliveries: items,
    completedDeliveries: completed.length,
    activeDeliveries: active.length,
    pendingDeliveries: pending.length,
    cancelledDeliveries: cancelled.length,
    averageRating: avgRating,
    complaintsCount: 0,
  }).send(res);
});

const adminUpdateDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.params.id);
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  const allowedFields = ['vehicleType', 'vehicleNumber', 'licenseNumber', 'area', 'isAvailable', 'isOnline'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) partner[field] = req.body[field];
  });
  if (req.body.assignedCity) partner.assignedCity = req.body.assignedCity;
  await partner.save();

  const populated = await DeliveryPartner.findById(partner._id).populate('user', 'name email phone').populate('assignedCity', 'name state');
  new ApiResponse(200, populated, 'Delivery partner updated successfully.').send(res);
});

const adminDeleteDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.params.id);
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  // No cascade-delete of historical OrderItem/delivery records — deactivate their login
  // (isActive is checked before any role-specific login logic) and remove the DeliveryPartner
  // doc itself; any OrderItem still referencing them keeps that reference for history.
  await User.findByIdAndUpdate(partner.user, { $set: { isActive: false } });
  await partner.deleteOne();

  new ApiResponse(200, null, 'Delivery partner deleted successfully.').send(res);
});

const approveDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.params.id).populate('user', 'name email');
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  partner.status = VENDOR_STATUS.APPROVED;
  partner.approvedBy = req.user._id;
  partner.approvedAt = new Date();
  partner.rejectionReason = '';
  await partner.save();

  await notificationService.sendEmail({
    to: partner.user.email,
    subject: 'Your RentEase delivery partner application has been approved',
    html: `<p>Hi ${partner.user.name},</p><p>Great news — your delivery partner application has been approved. You can now log in and start accepting deliveries.</p>`,
    text: 'Your delivery partner application has been approved. You can now log in.',
  });

  new ApiResponse(200, partner, 'Delivery partner approved successfully.').send(res);
});

const rejectDeliveryPartner = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const partner = await DeliveryPartner.findById(req.params.id).populate('user', 'name email');
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  partner.status = VENDOR_STATUS.REJECTED;
  partner.rejectionReason = reason || 'Application did not meet marketplace requirements.';
  partner.approvedBy = req.user._id;
  partner.approvedAt = new Date();
  await partner.save();

  await notificationService.sendEmail({
    to: partner.user.email,
    subject: 'Update on your RentEase delivery partner application',
    html: `<p>Hi ${partner.user.name},</p><p>Your delivery partner application was not approved.</p><p>Reason: ${partner.rejectionReason}</p>`,
    text: `Your delivery partner application was not approved. Reason: ${partner.rejectionReason}`,
  });

  new ApiResponse(200, partner, 'Delivery partner application rejected.').send(res);
});

const suspendDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.params.id);
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  partner.status = VENDOR_STATUS.SUSPENDED;
  await partner.save();
  new ApiResponse(200, partner, 'Delivery partner suspended.').send(res);
});

const reactivateDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.params.id).populate('user', 'name email');
  if (!partner) throw ApiError.notFound('Delivery partner not found.');
  if (partner.status !== VENDOR_STATUS.SUSPENDED && partner.status !== VENDOR_STATUS.REJECTED) {
    throw ApiError.badRequest('Only a suspended or rejected delivery partner can be reactivated.');
  }

  partner.status = VENDOR_STATUS.APPROVED;
  partner.approvedBy = req.user._id;
  partner.approvedAt = new Date();
  partner.rejectionReason = '';
  await partner.save();

  await notificationService.sendEmail({
    to: partner.user.email,
    subject: 'Your RentEase delivery partner account has been reactivated',
    html: `<p>Hi ${partner.user.name},</p><p>Your delivery partner account has been reactivated. You can log in and resume accepting deliveries immediately.</p>`,
    text: 'Your delivery partner account has been reactivated. You can log in now.',
  });

  new ApiResponse(200, partner, 'Delivery partner reactivated successfully.').send(res);
});

// ============================================================================
// Orders management — platform-wide OrderItem visibility, grouped the same way the Vendor
// Orders screen already groups statuses (pending / active / completed / cancelled).
// ============================================================================

const ORDER_STATUS_GROUPS = {
  pending: [ORDER_ITEM_STATUS.PENDING],
  active: [ORDER_ITEM_STATUS.CONFIRMED, ORDER_ITEM_STATUS.PREPARING, ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, ORDER_ITEM_STATUS.ACTIVE_RENTAL, ORDER_ITEM_STATUS.EXTENSION_REQUESTED, ORDER_ITEM_STATUS.PICKUP_SCHEDULED],
  completed: [ORDER_ITEM_STATUS.DELIVERED, ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED],
  cancelled: [ORDER_ITEM_STATUS.CANCELLED],
};

const adminListOrders = asyncHandler(async (req, res) => {
  const { group, status, city, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  else if (group && ORDER_STATUS_GROUPS[group]) filter.status = { $in: ORDER_STATUS_GROUPS[group] };
  if (city) filter.order = { $in: await orderIdsForCity(city) };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  // Summary chips reflect every status within the selected city (or the whole platform), not
  // narrowed further by whichever group tab is currently active — otherwise switching tabs
  // would make the OTHER chips' counts look wrong/stale.
  const cityOnlyFilter = city ? { order: filter.order } : {};

  const [items, total, statusCounts] = await Promise.all([
    OrderItem.find(filter)
      .populate('product', 'name images')
      .populate('vendor', 'businessName')
      .populate({ path: 'deliveryPartner', select: 'user vehicleType', populate: { path: 'user', select: 'name phone' } })
      .populate({ path: 'order', select: 'orderNumber customer placedAt', populate: { path: 'customer', select: 'name email' } })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    OrderItem.countDocuments(filter),
    OrderItem.aggregate([{ $match: cityOnlyFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  new ApiResponse(200, {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
  }).send(res);
});

// ============================================================================
// Rental management — current / upcoming-return / overdue views over active rentals.
// ============================================================================

const adminListRentals = asyncHandler(async (req, res) => {
  const { filter: rentalFilter = 'current', days = 7, city } = req.query;
  const now = new Date();

  let query;
  if (rentalFilter === 'completed') {
    query = { status: { $in: [ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED] } };
  } else if (rentalFilter === 'cancelled') {
    query = { status: ORDER_ITEM_STATUS.CANCELLED };
  } else {
    query = { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL };
    if (rentalFilter === 'overdue') {
      query.rentalEndDate = { $lt: now };
    } else if (rentalFilter === 'upcoming-returns') {
      const windowEnd = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);
      query.rentalEndDate = { $gte: now, $lte: windowEnd };
    }
  }
  if (city) query.order = { $in: await orderIdsForCity(city) };

  const cityOnlyFilter = city ? { order: { $in: await orderIdsForCity(city) } } : {};
  const rentalStatusGroups = {
    current: [ORDER_ITEM_STATUS.ACTIVE_RENTAL],
    completed: [ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED],
    cancelled: [ORDER_ITEM_STATUS.CANCELLED],
  };

  const [items, counts] = await Promise.all([
    OrderItem.find(query)
      .populate('product', 'name images')
      .populate('vendor', 'businessName')
      .populate({ path: 'deliveryPartner', select: 'user vehicleType', populate: { path: 'user', select: 'name phone' } })
      .populate({ path: 'order', select: 'orderNumber customer', populate: { path: 'customer', select: 'name email phone' } })
      .sort({ rentalEndDate: 1 })
      .limit(200),
    Promise.all(
      Object.entries(rentalStatusGroups).map(([key, statuses]) =>
        OrderItem.countDocuments({ ...cityOnlyFilter, status: { $in: statuses } }).then((n) => [key, n])
      )
    ),
  ]);

  new ApiResponse(200, { filter: rentalFilter, count: items.length, items, counts: Object.fromEntries(counts) }).send(res);
});

// ============================================================================
// Payments
// ============================================================================

const adminListPayments = asyncHandler(async (req, res) => {
  const { status, method, city, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (city) filter.order = { $in: await orderIdsForCity(city) };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('user', 'name email')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Payment.countDocuments(filter),
  ]);

  new ApiResponse(200, { items, total, page: pageNum, limit: limitNum, pages: Math.max(1, Math.ceil(total / limitNum)) }).send(res);
});

const adminPaymentsSummary = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const cityMatch = city ? { order: { $in: await orderIdsForCity(city) } } : {};

  const [byStatus, byMethod, byMonth] = await Promise.all([
    Payment.aggregate([{ $match: cityMatch }, { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { ...cityMatch, status: PAYMENT_STATUS.PAID } }, { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Payment.aggregate([
      { $match: { ...cityMatch, status: PAYMENT_STATUS.PAID } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
      { $limit: 12 },
    ]),
  ]);

  const revenue = byStatus.find((s) => s._id === PAYMENT_STATUS.PAID)?.total || 0;
  const refunded = byStatus.find((s) => s._id === PAYMENT_STATUS.REFUNDED)?.total || 0;

  new ApiResponse(200, {
    totalRevenue: revenue,
    totalRefunded: refunded,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, { total: s.total, count: s.count }])),
    byMethod: Object.fromEntries(byMethod.map((s) => [s._id, { total: s.total, count: s.count }])),
    byMonth: byMonth.map((b) => ({ year: b._id.y, month: b._id.m, total: b.total, count: b.count })),
  }).send(res);
});

// ============================================================================
// Notifications — platform broadcast
// ============================================================================

const adminBroadcastNotification = asyncHandler(async (req, res) => {
  const { audience, title, message } = req.body;

  const roleFilter = audience === 'all' ? {} : { role: audience };
  const recipients = await User.find(roleFilter).select('_id');
  if (!recipients.length) throw ApiError.badRequest('No matching users to notify.');

  await Notification.insertMany(
    recipients.map((u) => ({
      user: u._id,
      title,
      message,
      type: 'system',
      channels: ['in_app'],
      meta: { broadcast: true, audience, sentBy: req.user._id },
    }))
  );

  new ApiResponse(200, { recipientCount: recipients.length }, `Broadcast sent to ${recipients.length} user(s).`).send(res);
});

// ============================================================================
// Reports & analytics — platform-wide, genuinely computed (not the per-vendor client-synthesized
// pipeline in frontend/lib/mockVendorData.js, which only makes sense scoped to one vendor).
// ============================================================================

// Enterprise analytics dashboard — every figure below is computed live from real
// Order/OrderItem/Payment/Product/User/Vendor/DeliveryPartner documents (nothing hardcoded or
// pre-baked), and every relevant filter (city, date range, vendor, delivery partner, category)
// narrows the SAME underlying data rather than switching to a separate mocked dataset. Filters
// only apply where they're semantically meaningful for a given metric — e.g. vendor/category
// can't narrow a Payment (payments are order-level, and one order can span several vendors), so
// those stay city+date scoped only; that's documented per-block below rather than silently
// applied everywhere.
const adminAnalytics = asyncHandler(async (req, res) => {
  const { city, startDate, endDate, vendor, deliveryPartner, category, customer } = req.query;
  const now = new Date();
  const monthsBack = 11;
  const rangeStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const rangeEnd = endDate ? new Date(endDate) : now;

  // city and customer both narrow the same "which orders count" question, so they combine via
  // intersection rather than one silently overriding the other.
  let orderIds = city ? await orderIdsForCity(city) : null;
  if (customer) {
    const customerOrders = await Order.find({ customer: toObjectId(customer) }).select('_id');
    const customerOrderIds = customerOrders.map((o) => String(o._id));
    orderIds = orderIds ? orderIds.filter((id) => customerOrderIds.includes(String(id))) : customerOrders.map((o) => o._id);
  }
  const categoryProductIds = category
    ? (await Product.find({ category: toObjectId(category) }).select('_id')).map((p) => p._id)
    : null;

  // OrderItem-level filter — vendor/deliveryPartner/category all live directly (or one hop away
  // via product) on OrderItem, so every item-based aggregation below can honor all of them.
  const itemMatch = {};
  if (orderIds) itemMatch.order = { $in: orderIds };
  if (vendor) itemMatch.vendor = toObjectId(vendor);
  if (deliveryPartner) itemMatch.deliveryPartner = toObjectId(deliveryPartner);
  if (categoryProductIds) itemMatch.product = { $in: categoryProductIds };

  const dateRangedItemMatch = { ...itemMatch, createdAt: { $gte: rangeStart, $lte: rangeEnd } };

  // Order/Payment-level filter — city + date range only, for the reason in the block comment
  // (vendor/category/deliveryPartner don't apply at the Order level) — customer does apply here
  // directly since an Order always belongs to exactly one customer.
  const orderDateMatch = { createdAt: { $gte: rangeStart, $lte: rangeEnd } };
  if (city) orderDateMatch.city = toObjectId(city);
  if (customer) orderDateMatch.customer = toObjectId(customer);

  const paymentMatch = { status: PAYMENT_STATUS.PAID, createdAt: { $gte: rangeStart, $lte: rangeEnd } };
  if (orderIds) paymentMatch.order = { $in: orderIds };

  const productMatch = {};
  if (city) productMatch.city = toObjectId(city);
  if (category) productMatch.category = toObjectId(category);

  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    settings, revenuePaidAgg, totalOrders, totalRentals, totalCustomers, totalVendors, totalDeliveryPartners,
    activeProducts, inventoryValueAgg, pendingOrders, vendorGrowthCount, avgProductRatingAgg,
  ] = await Promise.all([
      PlatformSettings.getOrCreate(),
      Payment.aggregate([{ $match: paymentMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Order.countDocuments(orderDateMatch),
      OrderItem.countDocuments({ ...itemMatch, status: ORDER_ITEM_STATUS.ACTIVE_RENTAL }),
      User.countDocuments({ role: ROLES.CUSTOMER, ...(city ? { selectedCity: toObjectId(city) } : {}) }),
      Vendor.countDocuments(city ? { city: toObjectId(city) } : {}),
      DeliveryPartner.countDocuments(city ? { assignedCity: toObjectId(city) } : {}),
      Product.countDocuments({ ...productMatch, isActive: true }),
      Product.aggregate([{ $match: { ...productMatch, isActive: true } }, { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$securityDeposit'] } } } }]),
      OrderItem.countDocuments({ ...itemMatch, status: ORDER_ITEM_STATUS.PENDING }),
      Vendor.countDocuments({ createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...(city ? { city: toObjectId(city) } : {}) }),
      Product.aggregate([{ $match: { ...productMatch, isActive: true } }, { $group: { _id: null, avg: { $avg: '$averageRating' } } }]),
    ]);

  const totalRevenue = revenuePaidAgg[0]?.total || 0;

  const [revenueTrend, ordersTrend, rentalsTrend, weeklyRevenue, dailyRevenue, peakRentalHours] = await Promise.all([
    Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Order.aggregate([
      { $match: orderDateMatch },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    OrderItem.aggregate([
      { $match: { ...itemMatch, rentalStartDate: { $ne: null, $gte: rangeStart, $lte: rangeEnd } } },
      { $group: { _id: { y: { $year: '$rentalStartDate' }, m: { $month: '$rentalStartDate' } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.PAID, createdAt: { $gte: eightWeeksAgo }, ...(orderIds ? { order: { $in: orderIds } } : {}) } },
      { $group: { _id: { y: { $isoWeekYear: '$createdAt' }, w: { $isoWeek: '$createdAt' } }, revenue: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.w': 1 } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.PAID, createdAt: { $gte: thirtyDaysAgo }, ...(orderIds ? { order: { $in: orderIds } } : {}) } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } }, revenue: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]),
    OrderItem.aggregate([
      { $match: itemMatch },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const [
    ordersByStatus, revenueByCategory, productCountByCategory, customerGrowth, vendorGrowth, vendorPerformance,
    deliveryPerformance, topRentingProducts, topSellingProducts, paymentMethodBreakdown, inventoryUtilizationAgg, activityHeatmapAgg,
  ] = await Promise.all([
      OrderItem.aggregate([{ $match: itemMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      OrderItem.aggregate([
        { $match: itemMatch },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$category.name', revenue: { $sum: '$monthlyRentalPrice' } } },
        { $sort: { revenue: -1 } },
      ]),
      Product.aggregate([
        { $match: productMatch },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$category.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $match: { role: ROLES.CUSTOMER, createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...(city ? { selectedCity: toObjectId(city) } : {}) } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Vendor.aggregate([
        { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd }, ...(city ? { city: toObjectId(city) } : {}) } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      OrderItem.aggregate([
        { $match: { ...itemMatch, vendor: { $ne: null } } },
        { $group: { _id: '$vendor', revenue: { $sum: '$monthlyRentalPrice' }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
        { $unwind: '$vendor' },
        { $project: { businessName: '$vendor.businessName', revenue: 1, orders: 1, averageRating: '$vendor.averageRating' } },
      ]),
      OrderItem.aggregate([
        { $match: { ...itemMatch, deliveryPartner: { $ne: null } } },
        {
          $group: {
            _id: '$deliveryPartner',
            completedDeliveries: { $sum: { $cond: [{ $ne: ['$deliveredAt', null] }, 1, 0] } },
            avgRating: { $avg: '$deliveryRating' },
            totalAssigned: { $sum: 1 },
          },
        },
        { $sort: { completedDeliveries: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'deliverypartners', localField: '_id', foreignField: '_id', as: 'partner' } },
        { $unwind: '$partner' },
        { $lookup: { from: 'users', localField: 'partner.user', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$user.name', completedDeliveries: 1, totalAssigned: 1, avgRating: { $ifNull: ['$avgRating', 0] } } },
      ]),
      // "Top Renting" — ranked by units currently/ever rented out (quantity).
      OrderItem.aggregate([
        { $match: itemMatch },
        { $group: { _id: '$product', unitsRented: { $sum: '$quantity' }, orders: { $sum: 1 } } },
        { $sort: { unitsRented: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { name: '$product.name', images: '$product.images', unitsRented: 1, orders: 1 } },
      ]),
      // "Top Selling" — ranked by number of separate transactions (orders), not units — a
      // product with many one-off rentals ranks differently here than in "Top Renting".
      OrderItem.aggregate([
        { $match: itemMatch },
        { $group: { _id: '$product', unitsRented: { $sum: '$quantity' }, orders: { $sum: 1 } } },
        { $sort: { orders: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { name: '$product.name', images: '$product.images', unitsRented: 1, orders: 1 } },
      ]),
      Payment.aggregate([{ $match: paymentMatch }, { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      InventoryItem.aggregate([
        { $match: city ? { city: toObjectId(city) } : {} },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Customer activity heatmap — order volume by day-of-week ($dayOfWeek: 1=Sunday..7=Saturday)
      // x hour-of-day, so the Admin can see when customers are actually placing orders.
      Order.aggregate([
        { $match: orderDateMatch },
        { $group: { _id: { dow: { $dayOfWeek: '$createdAt' }, hour: { $hour: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
    ]);

  const [cities, cancelledCount, totalItemCount, deliveredFamilyCount, returnedFamilyCount, deliverySuccessCount, deliveryFailCount] = await Promise.all([
    City.find({ isActive: true }).select('name state'),
    OrderItem.countDocuments({ ...dateRangedItemMatch, status: ORDER_ITEM_STATUS.CANCELLED }),
    OrderItem.countDocuments(dateRangedItemMatch),
    OrderItem.countDocuments({
      ...dateRangedItemMatch,
      status: {
        $in: [
          ORDER_ITEM_STATUS.DELIVERED, ORDER_ITEM_STATUS.ACTIVE_RENTAL, ORDER_ITEM_STATUS.EXTENSION_REQUESTED,
          ORDER_ITEM_STATUS.PICKUP_SCHEDULED, ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED,
        ],
      },
    }),
    OrderItem.countDocuments({ ...dateRangedItemMatch, status: { $in: [ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED] } }),
    OrderItem.countDocuments({ ...dateRangedItemMatch, deliveryPartner: { $ne: null }, deliveredAt: { $ne: null } }),
    OrderItem.countDocuments({ ...dateRangedItemMatch, deliveryPartner: { $ne: null }, status: ORDER_ITEM_STATUS.CANCELLED }),
  ]);

  // City comparison — one pass per active city so Revenue/Orders/Rentals/Vendors/Customers/
  // Products all come from the same live collections as the rest of this endpoint, just
  // re-scoped per city.
  const cityComparison = await Promise.all(
    cities.map(async (c) => {
      const cOrderIds = await orderIdsForCity(c._id);
      const [revenueAgg, ordersCount, rentalsCount, vendorsCount, customersCount, productsCount] = await Promise.all([
        Payment.aggregate([
          { $match: { status: PAYMENT_STATUS.PAID, createdAt: { $gte: rangeStart, $lte: rangeEnd }, order: { $in: cOrderIds } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Order.countDocuments({ city: c._id, createdAt: { $gte: rangeStart, $lte: rangeEnd } }),
        OrderItem.countDocuments({ order: { $in: cOrderIds }, status: ORDER_ITEM_STATUS.ACTIVE_RENTAL }),
        Vendor.countDocuments({ city: c._id }),
        User.countDocuments({ role: ROLES.CUSTOMER, selectedCity: c._id }),
        Product.countDocuments({ city: c._id, isActive: true }),
      ]);
      return {
        cityId: c._id,
        cityName: c.name,
        state: c.state,
        revenue: revenueAgg[0]?.total || 0,
        orders: ordersCount,
        rentals: rentalsCount,
        vendors: vendorsCount,
        customers: customersCount,
        products: productsCount,
      };
    })
  );

  const inventoryByStatus = Object.fromEntries(inventoryUtilizationAgg.map((s) => [s._id, s.count]));
  const totalInventoryUnits = inventoryUtilizationAgg.reduce((sum, s) => sum + s.count, 0);

  new ApiResponse(200, {
    filters: {
      city: city || null, startDate: rangeStart, endDate: rangeEnd, vendor: vendor || null,
      deliveryPartner: deliveryPartner || null, category: category || null, customer: customer || null,
    },

    overview: {
      totalRevenue,
      totalOrders,
      totalRentals,
      completedRentals: returnedFamilyCount,
      cancelledOrders: cancelledCount,
      totalCustomers,
      totalVendors,
      totalDeliveryPartners,
      activeProducts,
      // Total deposit-backed asset value of current active inventory (stock x securityDeposit) —
      // this app has no purchase-cost field, so security deposit is the closest real proxy.
      inventoryValue: inventoryValueAgg[0]?.value || 0,
      // Platform's own take, not vendor P&L: revenue x platform commission %, the one commission
      // figure this app actually stores (PlatformSettings.platformFeePercent).
      profit: Math.round(totalRevenue * (settings.platformFeePercent / 100)),
      pendingOrders,
      // New vendor signups within the selected period/city — the "Vendor Growth" KPI number;
      // trends.vendorGrowth (below) is the same signal as a month-by-month chart.
      vendorGrowth: vendorGrowthCount,
      // Delivery Performance KPI — % of delivery-partner-assigned items that were actually
      // delivered vs. cancelled after assignment, within the selected period/city. Named
      // deliverySuccessRate (not deliveryPerformance) to avoid colliding with the top-level
      // `deliveryPerformance` array (the per-partner leaderboard) elsewhere in this response.
      deliverySuccessRate: deliverySuccessCount + deliveryFailCount ? Math.round((deliverySuccessCount / (deliverySuccessCount + deliveryFailCount)) * 1000) / 10 : 0,
      // Product Performance KPI — average rating across active products in scope; this app has
      // no other single normalized "product performance" figure to report honestly.
      productPerformance: Number((avgProductRatingAgg[0]?.avg || 0).toFixed(1)),
    },

    trends: {
      revenue: revenueTrend.map((s) => ({ year: s._id.y, month: s._id.m, revenue: s.revenue, orders: s.orders })),
      orders: ordersTrend.map((s) => ({ year: s._id.y, month: s._id.m, count: s.count })),
      rentals: rentalsTrend.map((s) => ({ year: s._id.y, month: s._id.m, count: s.count })),
      weeklyRevenue: weeklyRevenue.map((s) => ({ isoYear: s._id.y, isoWeek: s._id.w, revenue: s.revenue })),
      dailyRevenue: dailyRevenue.map((s) => ({ year: s._id.y, month: s._id.m, day: s._id.d, revenue: s.revenue })),
      peakRentalHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: peakRentalHours.find((p) => p._id === h)?.count || 0 })),
      vendorGrowth: vendorGrowth.map((s) => ({ year: s._id.y, month: s._id.m, count: s.count })),
    },

    ordersByStatus: Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count])),
    revenueByCategory: revenueByCategory.map((c) => ({ category: c._id || 'Uncategorized', revenue: c.revenue })),
    productCountByCategory: productCountByCategory.map((c) => ({ category: c._id || 'Uncategorized', count: c.count })),
    customerGrowth: customerGrowth.map((c) => ({ year: c._id.y, month: c._id.m, count: c.count })),
    vendorPerformance,
    deliveryPerformance,
    topRentingProducts,
    topSellingProducts,
    paymentMethods: Object.fromEntries(paymentMethodBreakdown.map((s) => [s._id, { total: s.total, count: s.count }])),
    cityComparison,
    // 7 (Sun-Sat) x 24 grid, zero-filled — raw order volume by day-of-week and hour-of-day.
    customerActivityHeatmap: Array.from({ length: 7 }, (_, dowIdx) =>
      Array.from({ length: 24 }, (_, hour) => activityHeatmapAgg.find((a) => a._id.dow === dowIdx + 1 && a._id.hour === hour)?.count || 0)
    ),

    inventoryUtilization: {
      byStatus: inventoryByStatus,
      total: totalInventoryUnits,
      utilizationPercent: totalInventoryUnits
        ? Math.round((((inventoryByStatus.out_for_rent || 0) + (inventoryByStatus.reserved || 0)) / totalInventoryUnits) * 1000) / 10
        : 0,
    },

    cancellationRate: totalItemCount ? Math.round((cancelledCount / totalItemCount) * 1000) / 10 : 0,
    // Of items that made it to "delivered" or beyond, what % completed the full rental cycle
    // (returned/completed) rather than sitting in an in-progress state (active_rental etc).
    returnRate: deliveredFamilyCount ? Math.round((returnedFamilyCount / deliveredFamilyCount) * 1000) / 10 : 0,
    deliverySuccessRate: deliverySuccessCount + deliveryFailCount ? Math.round((deliverySuccessCount / (deliverySuccessCount + deliveryFailCount)) * 1000) / 10 : 0,
  }).send(res);
});

// ============================================================================
// Settings — platform config singleton + rental plans (the "Taxes / Fees / Rental Plans /
// Policies" screen). Reads/writes the exact same PlatformSettings + RentalPlan documents the
// rest of the app would consult wherever it needs these values, so changes here are real.
// ============================================================================

const adminGetSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.getOrCreate();
  new ApiResponse(200, settings).send(res);
});

const adminUpdateSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.getOrCreate();
  Object.assign(settings, req.body, { updatedBy: req.user._id });
  await settings.save();
  new ApiResponse(200, settings, 'Settings updated.').send(res);
});

const adminListRentalPlans = asyncHandler(async (req, res) => {
  const plans = await RentalPlan.find({}).sort({ durationMonths: 1 });
  new ApiResponse(200, plans).send(res);
});

const adminUpsertRentalPlan = asyncHandler(async (req, res) => {
  const { durationMonths, label, discountPercent, isActive } = req.body;
  const plan = await RentalPlan.findOneAndUpdate(
    { durationMonths },
    { label, discountPercent, isActive: isActive ?? true, createdBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  new ApiResponse(200, plan, 'Rental plan saved.').send(res);
});

const adminDeleteRentalPlan = asyncHandler(async (req, res) => {
  const plan = await RentalPlan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Rental plan not found.');
  await plan.deleteOne();
  new ApiResponse(200, null, 'Rental plan deleted.').send(res);
});

module.exports = {
  listVendors,
  getVendor,
  approveVendor,
  rejectVendor,
  suspendVendor,
  reactivateVendor,
  adminUpdateVendor,
  adminDeleteVendor,
  getVendorPerformance,
  getDashboardStats,
  adminListProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminSetProductApproval,
  adminDeleteProduct,
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminInventoryOverview,
  adminListCustomers,
  adminGetCustomer,
  adminListDeliveryPartners,
  adminGetDeliveryPartner,
  approveDeliveryPartner,
  rejectDeliveryPartner,
  suspendDeliveryPartner,
  reactivateDeliveryPartner,
  adminUpdateDeliveryPartner,
  adminDeleteDeliveryPartner,
  adminListOrders,
  adminListRentals,
  adminListPayments,
  adminPaymentsSummary,
  adminBroadcastNotification,
  adminAnalytics,
  adminGetSettings,
  adminUpdateSettings,
  adminListRentalPlans,
  adminUpsertRentalPlan,
  adminDeleteRentalPlan,
};
