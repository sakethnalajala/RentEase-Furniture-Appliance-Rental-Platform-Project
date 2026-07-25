const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: 'products',
    populate: [
      { path: 'category', select: 'name slug' },
      { path: 'vendor', select: 'businessName' },
      { path: 'city', select: 'name' },
    ],
  });

  new ApiResponse(200, wishlist?.products || []).send(res);
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('Product not found.');

  await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { products: productId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  new ApiResponse(200, null, 'Added to wishlist.').send(res);
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  await Wishlist.findOneAndUpdate({ user: req.user._id }, { $pull: { products: productId } });
  new ApiResponse(200, null, 'Removed from wishlist.').send(res);
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
