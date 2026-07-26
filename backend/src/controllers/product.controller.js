const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Product = require('../models/Product');
const RentalPlan = require('../models/RentalPlan');
const InventoryItem = require('../models/InventoryItem');

const SORTS = {
  price_asc: { monthlyRentalPrice: 1 },
  price_desc: { monthlyRentalPrice: -1 },
  rating: { averageRating: -1 },
  newest: { createdAt: -1 },
  popular: { numReviews: -1 },
  best_selling: { unitsRented: -1 },
  discount: { discountPercent: -1 },
};

// Public catalog listing — browsing doesn't require an account; the /customer area that
// calls this is what's gated behind login on the frontend.
const listProducts = asyncHandler(async (req, res) => {
  const { city, category, subCategory, search, brand, vendor, minPrice, maxPrice, minRating, minDiscount, sort, page, limit } =
    req.query;

  const filter = { isActive: true };
  if (city) filter.city = city;
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (brand) filter.brand = brand;
  if (vendor) filter.vendor = vendor;
  if (minRating !== undefined) filter.averageRating = { $gte: minRating };
  if (minDiscount !== undefined) filter.discountPercent = { $gte: minDiscount };
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.monthlyRentalPrice = {};
    if (minPrice !== undefined) filter.monthlyRentalPrice.$gte = minPrice;
    if (maxPrice !== undefined) filter.monthlyRentalPrice.$lte = maxPrice;
  }
  if (search) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { brand: regex }, { subCategory: regex }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('vendor', 'businessName')
      .populate('city', 'name state')
      .sort(SORTS[sort] || SORTS.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  new ApiResponse(200, { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }).send(res);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true })
    .populate('category', 'name slug')
    .populate('vendor', 'businessName averageRating')
    .populate('city', 'name state')
    .lean();

  if (!product) throw ApiError.notFound('Product not found.');

  const [rentalPlans, inventoryItem, relatedProducts] = await Promise.all([
    RentalPlan.find({ isActive: true }).sort({ durationMonths: 1 }).lean(),
    InventoryItem.findOne({ product: product._id }).select('serialNumber qrCodeUrl barcodeUrl status').lean(),
    Product.find({
      _id: { $ne: product._id },
      category: product.category._id,
      subCategory: product.subCategory,
      isActive: true,
    })
      .populate('city', 'name')
      .limit(8)
      .lean(),
  ]);

  new ApiResponse(200, { product, rentalPlans, inventory: inventoryItem, relatedProducts }).send(res);
});

// Distinct subCategory values for the current filter context — powers Browse's type tabs.
const listSubCategories = asyncHandler(async (req, res) => {
  const { category, city } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (city) filter.city = city;

  const subCategories = await Product.distinct('subCategory', filter);
  new ApiResponse(200, subCategories.filter(Boolean).sort()).send(res);
});

module.exports = { listProducts, getProductById, listSubCategories };
