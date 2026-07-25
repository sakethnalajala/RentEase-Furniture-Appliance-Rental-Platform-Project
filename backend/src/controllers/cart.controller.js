const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const RentalPlan = require('../models/RentalPlan');

async function populatedCart(userId) {
  return Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      populate: [
        { path: 'category', select: 'name slug' },
        { path: 'vendor', select: 'businessName' },
        { path: 'city', select: 'name' },
      ],
    })
    .populate('items.rentalPlan');
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await populatedCart(req.user._id);
  new ApiResponse(200, cart || { items: [] }).send(res);
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, rentalPlanId, quantity = 1 } = req.body;

  const [product, rentalPlan] = await Promise.all([
    Product.findOne({ _id: productId, isActive: true }),
    RentalPlan.findOne({ _id: rentalPlanId, isActive: true }),
  ]);
  if (!product) throw ApiError.notFound('Product not found.');
  if (!rentalPlan) throw ApiError.notFound('Rental plan not found.');

  let cart = await Cart.findOne({ user: req.user._id });

  // A cart only ever holds inventory from one city — customers browse one city at a time,
  // and mixing cities would break a single delivery-scheduling checkout.
  if (cart && cart.items.length > 0 && String(cart.city) !== String(product.city)) {
    throw ApiError.badRequest(
      'Your cart has items from a different city. Clear your cart before adding products from another city.'
    );
  }

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, city: product.city, items: [] });
  }

  const existingItem = cart.items.find(
    (item) => String(item.product) === String(productId) && String(item.rentalPlan) === String(rentalPlanId)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      product: productId,
      vendor: product.vendor,
      rentalPlan: rentalPlanId,
      quantity,
      monthlyRentalPrice: product.monthlyRentalPrice,
      securityDeposit: product.securityDeposit,
    });
  }

  await cart.save();
  const populated = await populatedCart(req.user._id);
  new ApiResponse(200, populated, 'Added to cart.').send(res);
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity, rentalPlanId } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found.');

  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Cart item not found.');

  if (quantity !== undefined) {
    if (quantity < 1) throw ApiError.badRequest('Quantity must be at least 1.');
    item.quantity = quantity;
  }
  if (rentalPlanId) {
    const rentalPlan = await RentalPlan.findOne({ _id: rentalPlanId, isActive: true });
    if (!rentalPlan) throw ApiError.notFound('Rental plan not found.');
    item.rentalPlan = rentalPlanId;
  }

  await cart.save();
  const populated = await populatedCart(req.user._id);
  new ApiResponse(200, populated, 'Cart updated.').send(res);
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found.');

  cart.items.pull({ _id: itemId });
  await cart.save();
  const populated = await populatedCart(req.user._id);
  new ApiResponse(200, populated, 'Item removed from cart.').send(res);
});

const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });
  new ApiResponse(200, { items: [] }, 'Cart cleared.').send(res);
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
