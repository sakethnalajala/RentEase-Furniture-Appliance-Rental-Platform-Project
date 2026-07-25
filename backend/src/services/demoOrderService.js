const crypto = require('crypto');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const RentalPlan = require('../models/RentalPlan');
const User = require('../models/User');
const City = require('../models/City');
const Address = require('../models/Address');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/orderStatus');
const { DEMO_CUSTOMERS, DELIVERY_ADDRESSES } = require('../data/demoDeliveryData');
const { AREA_BY_CITY, CITY_META } = require('../data/demoScaleData');

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const generateFourDigitOtp = () => crypto.randomInt(1000, 10000).toString();
const generateOrderNumber = () => `REQ${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Real, city-correct delivery address for a customer: prefers their own saved Address (area,
// pincode, everything genuinely theirs) and only falls back to a plausible generated one — using
// this city's own area/pincode pools, never Hyderabad's — if they have none saved.
async function resolveDeliveryAddress(customer, cityName, stateName) {
  const saved = await Address.findOne({ user: customer._id }).sort({ isDefault: -1 });
  if (saved) {
    return {
      addressLine1: saved.addressLine1,
      addressLine2: saved.addressLine2,
      pincode: saved.pincode,
    };
  }
  const areas = AREA_BY_CITY[cityName] || AREA_BY_CITY.Hyderabad;
  const area = pick(areas);
  const legacy = pick(DELIVERY_ADDRESSES);
  const pincodeBase = (CITY_META[cityName] || CITY_META.Hyderabad).pincodeBase;
  return {
    addressLine1: legacy.addressLine1,
    addressLine2: area,
    pincode: `${pincodeBase}${String(10 + Math.floor(Math.random() * 90)).padStart(3, '0')}`,
  };
}

// Keeps the Delivery Requests pool feeling like a live, real application instead of a static
// seed snapshot: whenever it's read and running low, this synthesizes `count` more real
// Order/OrderItem/Payment documents — genuinely persisted, genuinely queryable everywhere else
// in the app (Vendor Orders, Customer... well, these synthetic customers can't log in, but the
// records are otherwise indistinguishable from a real checkout) — status starts at CONFIRMED
// (skipping the pending-vendor-approval step) since these exist purely to keep the delivery
// partner's queue populated, not to exercise the vendor-approval flow (real checkouts via the
// actual UI still go through the full pending -> confirmed path).
async function generateOpenDeliveryRequests({ cityId, count }) {
  if (count <= 0) return 0;

  const [products, rentalPlans, city] = await Promise.all([
    Product.find({ city: cityId, isActive: true }).select('vendor city monthlyRentalPrice securityDeposit deliveryCharge installationRequired'),
    RentalPlan.find({ isActive: true }),
    City.findById(cityId).select('name state'),
  ]);
  const cityName = city?.name || 'Hyderabad';
  const stateName = city?.state || 'Telangana';
  const customerPool = await getOrCreateDemoCustomerPool(cityId);
  if (!products.length || !rentalPlans.length || !customerPool.length) return 0;

  let created = 0;
  for (let i = 0; i < count; i++) {
    const product = pick(products);
    const plan = pick(rentalPlans);
    const customer = pick(customerPool);
    const addr = await resolveDeliveryAddress(customer, cityName, stateName);

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const gstAmount = Math.round(monthlyRentalPrice * 0.18);
    const grandTotalDue = monthlyRentalPrice + product.securityDeposit + product.deliveryCharge + gstAmount;

    // Recent-looking request time (0-6 hours ago) so the queue reads as "just came in".
    const placedAt = new Date(Date.now() - Math.floor(Math.random() * 6 * 60 * 60 * 1000));
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: customer._id,
      city: cityId,
      deliveryAddress: {
        contactName: customer.name,
        contactPhone: customer.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: cityName,
        state: stateName,
        pincode: addr.pincode,
      },
      items: [],
      totalMonthlyRental: monthlyRentalPrice,
      totalSecurityDeposit: product.securityDeposit,
      totalDeliveryCharge: product.deliveryCharge,
      grandTotalDue,
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentMethod: pick(Object.values(PAYMENT_METHOD)),
      placedAt,
      createdAt: placedAt,
    });

    const plainOtp = generateFourDigitOtp();
    const orderItem = await OrderItem.create({
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
      status: ORDER_ITEM_STATUS.CONFIRMED,
      statusHistory: [
        { status: ORDER_ITEM_STATUS.PENDING, changedAt: placedAt, note: 'Order placed and paid.' },
        { status: ORDER_ITEM_STATUS.CONFIRMED, changedAt: placedAt, note: 'Confirmed by vendor.' },
      ],
      createdAt: placedAt,
    });

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

    created++;
  }

  return created;
}

// Real customers who actually belong to this city (seeded via seed.js's seedCityCustomers —
// >=50 per city, each with `selectedCity` set and a real saved Address) come first, so a given
// city's open-request customer names/addresses are genuinely that city's own. Falls back to the
// flat cross-city DEMO_CUSTOMERS pool, and finally to any customer at all, purely so this never
// hard-fails the Requests page on a fresh/partial DB — but a real city-scoped seed always
// satisfies the first branch.
async function getOrCreateDemoCustomerPool(cityId) {
  if (cityId) {
    const cityUsers = await User.find({ role: 'customer', selectedCity: cityId }).select('_id name email phone').limit(50);
    if (cityUsers.length) return cityUsers;
  }

  const emails = DEMO_CUSTOMERS.map((c) => c.email);
  let users = await User.find({ email: { $in: emails } }).select('_id name email phone');
  if (!users.length) {
    users = await User.find({ role: 'customer' }).select('_id name email phone').limit(20);
  }
  return users;
}

module.exports = { generateOpenDeliveryRequests };
