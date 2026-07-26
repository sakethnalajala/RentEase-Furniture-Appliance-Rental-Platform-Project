const crypto = require('crypto');
const logger = require('../utils/logger');
const Product = require('../models/Product');
const RentalPlan = require('../models/RentalPlan');
const City = require('../models/City');
const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/orderStatus');
const { DELIVERY_ADDRESSES } = require('../data/demoDeliveryData');

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Real Wishlist/Cart/Address/Order documents against the ACTUAL existing product catalog (no
// fabricated products) — so a brand new customer's Wishlist, Cart, Addresses, Notifications,
// and Rentals stats (see the Customer Profile page) are genuinely theirs from the first login
// instead of an empty account. City-scoped where the field exists, falling back to any active
// product if this account's city has none (shouldn't happen for the four seeded metros, but
// keeps this from silently no-op'ing if it ever does).
async function generateCustomerDemoData(user, cityId) {
  const existing = await Wishlist.findOne({ user: user._id });
  if (existing) return { skipped: true };

  const [cityProducts, rentalPlans, cityDoc] = await Promise.all([
    cityId ? Product.find({ city: cityId, isActive: true }).limit(60) : [],
    RentalPlan.find({}),
    cityId ? City.findById(cityId).select('name state') : null,
  ]);
  const products = cityProducts.length ? cityProducts : await Product.find({ isActive: true }).limit(60);
  if (!products.length || !rentalPlans.length) return { skipped: true, reason: 'no catalog yet' };

  const cityName = cityDoc?.name || 'Hyderabad';
  const stateName = cityDoc?.state || 'Telangana';
  const effectiveCityId = cityId || products[0].city;

  // Wishlist: 3-6 distinct products.
  const wishlistProducts = shuffle(products).slice(0, 3 + Math.floor(Math.random() * 4));
  await Wishlist.create({ user: user._id, products: wishlistProducts.map((p) => p._id) });

  // Cart: 1-2 items, each on a real rental plan.
  const cartProducts = shuffle(products).slice(0, 1 + Math.floor(Math.random() * 2));
  await Cart.create({
    user: user._id,
    city: effectiveCityId,
    items: cartProducts.map((p) => {
      const plan = pick(rentalPlans);
      return {
        product: p._id,
        vendor: p.vendor,
        rentalPlan: plan._id,
        quantity: 1,
        monthlyRentalPrice: p.monthlyRentalPrice,
        securityDeposit: p.securityDeposit,
      };
    }),
  });

  // Address: one default address in this customer's own city.
  const addr = pick(DELIVERY_ADDRESSES);
  await Address.create({
    user: user._id,
    label: 'Home',
    contactName: user.name,
    contactPhone: user.phone || '9000000000',
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2,
    city: effectiveCityId,
    state: stateName,
    pincode: '500' + (10 + Math.floor(Math.random() * 90)),
    isDefault: true,
  });

  // Rental history: 2-4 real Orders/OrderItems/Payments, a mix of an in-progress rental and
  // completed ones, so the Profile's Active/Completed Rental stats and Total Spending are
  // genuinely non-zero rather than blank on the very first visit.
  const orderCount = 2 + Math.floor(Math.random() * 3);
  let seeded = 0;
  const notifItems = [];

  for (let i = 0; i < orderCount; i++) {
    const product = pick(products);
    const plan = pick(rentalPlans);
    const status = i === 0 ? ORDER_ITEM_STATUS.ACTIVE_RENTAL : pick([ORDER_ITEM_STATUS.COMPLETED, ORDER_ITEM_STATUS.COMPLETED, ORDER_ITEM_STATUS.CONFIRMED]);

    const daysAgo = 10 + Math.floor(Math.random() * 90);
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - daysAgo);

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const gstAmount = Math.round(monthlyRentalPrice * 0.18);
    const grandTotalDue = monthlyRentalPrice + product.securityDeposit + product.deliveryCharge + gstAmount;

    const order = await Order.create({
      orderNumber: `C${user._id.toString().slice(-5).toUpperCase()}${Date.now().toString(36).toUpperCase()}${i}`,
      customer: user._id,
      city: effectiveCityId,
      deliveryAddress: {
        contactName: user.name,
        contactPhone: user.phone || '9000000000',
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: cityName,
        state: stateName,
        pincode: '500' + (10 + Math.floor(Math.random() * 90)),
      },
      items: [],
      totalMonthlyRental: monthlyRentalPrice,
      totalSecurityDeposit: product.securityDeposit,
      totalDeliveryCharge: product.deliveryCharge,
      grandTotalDue,
      status: status === ORDER_ITEM_STATUS.COMPLETED ? ORDER_STATUS.COMPLETED : ORDER_STATUS.IN_PROGRESS,
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentMethod: pick(Object.values(PAYMENT_METHOD)),
      placedAt,
      createdAt: placedAt,
    });

    const plainOtp = String(1000 + Math.floor(Math.random() * 9000));
    const deliveredAt = new Date(placedAt.getTime() + 26 * 60 * 60 * 1000);
    const itemFields = {
      order: order._id,
      vendor: product.vendor,
      product: product._id,
      rentalPlan: plan._id,
      quantity: 1,
      monthlyRentalPrice,
      securityDeposit: product.securityDeposit,
      deliveryCharge: product.deliveryCharge,
      discountPercent: plan.discountPercent || 0,
      installationRequired: product.installationRequired,
      deliveryOtpHash: hashCode(plainOtp),
      status,
      statusHistory: [
        { status: ORDER_ITEM_STATUS.PENDING, changedAt: placedAt, note: 'Order placed and paid.' },
        { status: ORDER_ITEM_STATUS.CONFIRMED, changedAt: placedAt, note: 'Confirmed by vendor.' },
      ],
      pickedUpAt: status !== ORDER_ITEM_STATUS.CONFIRMED ? new Date(placedAt.getTime() + 2 * 60 * 60 * 1000) : null,
      deliveredAt: status !== ORDER_ITEM_STATUS.CONFIRMED ? deliveredAt : null,
      rentalStartDate: status !== ORDER_ITEM_STATUS.CONFIRMED ? deliveredAt : null,
    };

    if (status !== ORDER_ITEM_STATUS.CONFIRMED) {
      const end = new Date(deliveredAt);
      end.setMonth(end.getMonth() + plan.durationMonths);
      itemFields.rentalEndDate = end;
    }

    const orderItem = await OrderItem.create(itemFields);
    order.items = [orderItem._id];
    await order.save();

    await Payment.create({
      order: order._id,
      user: user._id,
      amount: grandTotalDue,
      method: order.paymentMethod,
      status: PAYMENT_STATUS.PAID,
      type: 'rental',
      createdAt: placedAt,
    });

    notifItems.push({ product, status, createdAt: placedAt });
    seeded++;
  }

  // Notifications: real order-confirmation / delivery updates tied to the orders just created.
  const notifDocs = notifItems.map(({ product, status, createdAt }, i) => ({
    user: user._id,
    title: status === ORDER_ITEM_STATUS.COMPLETED ? 'Rental completed' : status === ORDER_ITEM_STATUS.ACTIVE_RENTAL ? 'Order delivered' : 'Order confirmed',
    message:
      status === ORDER_ITEM_STATUS.COMPLETED
        ? `Your rental of ${product.name} has been completed. We hope you enjoyed it!`
        : status === ORDER_ITEM_STATUS.ACTIVE_RENTAL
          ? `${product.name} has been delivered and your rental period has started.`
          : `Your order for ${product.name} has been confirmed by the vendor.`,
    type: 'order',
    channels: ['in_app'],
    isRead: i > 0,
    relatedEntity: { type: 'product', id: product._id },
    createdAt: new Date(createdAt.getTime() + 26 * 60 * 60 * 1000),
  }));
  notifDocs.push({
    user: user._id,
    title: 'Welcome to RentEase',
    message: 'Your account is ready — browse furniture and appliances available for rent in your city.',
    type: 'system',
    channels: ['in_app'],
    isRead: false,
    createdAt: new Date(),
  });
  await Notification.insertMany(notifDocs);

  logger.success(`Onboarded customer "${user.name}": wishlist, cart, address, ${seeded} orders, notifications seeded.`);
  return { orders: seeded };
}

module.exports = { generateCustomerDemoData };
