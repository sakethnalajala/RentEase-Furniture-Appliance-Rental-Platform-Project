const crypto = require('crypto');
const logger = require('../utils/logger');
const Product = require('../models/Product');
const RentalPlan = require('../models/RentalPlan');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/orderStatus');
const { DELIVERY_REVIEWS, DELIVERY_ADDRESSES } = require('../data/demoDeliveryData');

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Real Order/OrderItem/Payment documents in the partner's own assigned city, credited to this
// partner — some already completed (so History/Earnings/Ratings/Weekly performance aren't
// blank) and one still in flight (so Assigned Deliveries has something to act on). "Open
// delivery requests" needs no seeding here: demoOrderService.generateOpenDeliveryRequests
// already tops up each city's unassigned-request pool at runtime (see delivery.controller.js's
// listRequests), independent of which partners exist.
async function generateDeliveryPartnerDemoData(partner) {
  const existing = await OrderItem.countDocuments({ deliveryPartner: partner._id });
  if (existing > 0) return { skipped: true };

  const [products, rentalPlans, customers] = await Promise.all([
    Product.find({ city: partner.assignedCity, isActive: true }).limit(40),
    RentalPlan.find({}),
    User.find({ role: 'customer' }).select('_id name phone').limit(40),
  ]);
  if (!products.length || !rentalPlans.length || !customers.length) return { skipped: true, reason: 'no catalog/customers yet' };

  const scenarios = [
    { status: ORDER_ITEM_STATUS.COMPLETED, daysAgo: 6 },
    { status: ORDER_ITEM_STATUS.COMPLETED, daysAgo: 3 },
    { status: ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, daysAgo: 0 },
  ];

  let completedCount = 0;
  let totalEarnings = 0;
  const notifDocs = [];

  for (let i = 0; i < scenarios.length; i++) {
    const { status, daysAgo } = scenarios[i];
    const product = pick(products);
    const plan = pick(rentalPlans);
    const customer = pick(customers);
    const addr = pick(DELIVERY_ADDRESSES);

    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - daysAgo - 1);

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const gstAmount = Math.round(monthlyRentalPrice * 0.18);
    const grandTotalDue = monthlyRentalPrice + product.securityDeposit + product.deliveryCharge + gstAmount;

    const order = await Order.create({
      orderNumber: `D${partner._id.toString().slice(-5).toUpperCase()}${Date.now().toString(36).toUpperCase()}${i}`,
      customer: customer._id,
      city: partner.assignedCity,
      deliveryAddress: {
        contactName: customer.name,
        contactPhone: customer.phone || '9000000001',
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
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
    const deliveryFee = 60 + Math.round(product.deliveryCharge * 0.5);
    const review = status === ORDER_ITEM_STATUS.COMPLETED ? pick(DELIVERY_REVIEWS) : null;
    const pickedUpAt = new Date(placedAt.getTime() + (1.5 + Math.random()) * 60 * 60 * 1000);
    const deliveredAt = new Date(pickedUpAt.getTime() + (18 + Math.random() * 10) * 60 * 60 * 1000);

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
        { status: ORDER_ITEM_STATUS.CONFIRMED, changedAt: placedAt, note: 'Confirmed by vendor.' },
        { status: ORDER_ITEM_STATUS.PREPARING, changedAt: placedAt, note: 'Accepted by delivery partner.' },
      ],
      deliveryPartner: partner._id,
      deliveryFee,
      pickedUpAt,
    };

    if (status === ORDER_ITEM_STATUS.COMPLETED) {
      itemFields.deliveredAt = deliveredAt;
      itemFields.rentalStartDate = deliveredAt;
      const end = new Date(deliveredAt);
      end.setMonth(end.getMonth() + plan.durationMonths);
      itemFields.rentalEndDate = end;
      itemFields.deliveryRating = review.rating;
      itemFields.deliveryReviewComment = review.comment;
      itemFields.deliveryReviewDate = deliveredAt;
      completedCount++;
      totalEarnings += deliveryFee;
    }

    const orderItem = await OrderItem.create(itemFields);
    order.items = [orderItem._id];
    await order.save();

    await Payment.create({
      order: order._id,
      user: customer._id,
      amount: grandTotalDue,
      method: order.paymentMethod,
      status: PAYMENT_STATUS.PAID,
      type: 'rental',
      createdAt: placedAt,
    });

    if (status === ORDER_ITEM_STATUS.COMPLETED) {
      notifDocs.push({
        user: partner.user,
        title: 'Delivery completed',
        message: `You delivered ${product.name} to ${customer.name} and earned ₹${deliveryFee}.`,
        type: 'delivery',
        channels: ['in_app'],
        isRead: i > 0,
        relatedEntity: { type: 'product', id: product._id },
        createdAt: deliveredAt,
      });
    }
  }

  notifDocs.push({
    user: partner.user,
    title: 'Welcome to RentEase Delivery',
    message: 'Your delivery partner account is ready — go online to start receiving requests in your city.',
    type: 'system',
    channels: ['in_app'],
    isRead: false,
    createdAt: new Date(),
  });
  await Notification.insertMany(notifDocs);

  const avgRating = DELIVERY_REVIEWS.reduce((s, r) => s + r.rating, 0) / DELIVERY_REVIEWS.length;
  await DeliveryPartner.findByIdAndUpdate(partner._id, {
    $inc: { totalDeliveries: completedCount, totalEarnings },
    $set: { averageRating: Number(avgRating.toFixed(1)) },
  });

  logger.success(`Onboarded delivery partner "${partner.user}": ${completedCount} completed deliveries, notifications seeded.`);
  return { completedCount, totalEarnings };
}

module.exports = { generateDeliveryPartnerDemoData };
