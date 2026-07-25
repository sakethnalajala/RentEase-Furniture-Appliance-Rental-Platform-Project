const crypto = require('crypto');
const logger = require('../utils/logger');
const { generateInventoryAssets } = require('../utils/inventoryAssets');
const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const RentalPlan = require('../models/RentalPlan');
const User = require('../models/User');
const City = require('../models/City');
const DeliveryPartner = require('../models/DeliveryPartner');
const Notification = require('../models/Notification');
const { INVENTORY_STATUS } = require('../constants/inventoryStatus');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/orderStatus');
const {
  FURNITURE_TYPES,
  APPLIANCE_TYPES,
  productImages,
  COLORS,
  MODEL_SUFFIXES,
  CONDITIONS,
  INSTALL_REQUIRED_TYPES,
  slug,
  randomInRange,
} = require('../data/demoProducts');
const { DELIVERY_REVIEWS, DELIVERY_ADDRESSES } = require('../data/demoDeliveryData');

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// A small, distinctive catalog for one newly-approved vendor — reuses the exact same real
// image pools / brand / price data as the main demo catalog (generateDemoProducts) for visual
// consistency, but with its own randomized type/brand/price mix, own city (the vendor's actual
// registered operating city, not a multi-city spread), and globally-unique SKUs/serials so
// nothing collides with the main catalog or another new vendor's products.
async function generateVendorProducts(vendor) {
  const allTypes = [
    ...FURNITURE_TYPES.map((t) => ({ ...t, categorySlug: 'furniture' })),
    ...APPLIANCE_TYPES.map((t) => ({ ...t, categorySlug: 'appliances' })),
  ];
  const Category = require('../models/Category');
  const categories = await Category.find({});
  const categoryIdBySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

  const vendorTag = vendor._id.toString().slice(-6);
  const chosenTypeCount = 5 + Math.floor(Math.random() * 5); // 5-9 distinct product types
  const chosenTypes = shuffle(allTypes).slice(0, chosenTypeCount);

  const products = [];
  let seq = 1;
  for (const def of chosenTypes) {
    const { type, brands, price, depositX, categorySlug } = def;
    const countForType = 2 + Math.floor(Math.random() * 4); // 2-5 products per type
    for (let i = 0; i < countForType; i++) {
      const brand = pick(brands);
      const monthlyRentalPrice = randomInRange(price[0], price[1]);
      const securityDeposit = Math.round(monthlyRentalPrice * depositX);
      const hasDiscount = Math.random() < 0.3;
      const modelName = `${brand} ${type.replace(/s$/, '')} ${pick(MODEL_SUFFIXES)}`;

      products.push({
        vendor: vendor._id,
        isRentEaseOwned: false,
        name: modelName,
        category: categoryIdBySlug[categorySlug],
        subCategory: type,
        brand,
        model: `${slug(brand)}-${100 + seq}`,
        description: `Well-maintained ${type.toLowerCase()} from ${brand}, available for monthly rental. Flexible plans, free delivery scheduling, and hassle-free returns.`,
        images: productImages(seq, type, brand, i),
        purchaseYear: 2021 + (seq % 4),
        condition: pick(CONDITIONS),
        color: pick(COLORS),
        sku: `v${vendorTag}-${slug(type)}-${seq}`,
        stock: 1 + Math.floor(Math.random() * 6),
        city: vendor.city,
        monthlyRentalPrice,
        securityDeposit,
        minRentalPeriodMonths: 1,
        maxRentalPeriodMonths: 12,
        deliveryCharge: monthlyRentalPrice > 2000 ? 0 : randomInRange(99, 299),
        estimatedDeliveryDays: 1 + Math.floor(Math.random() * 4),
        installationRequired: INSTALL_REQUIRED_TYPES.has(type),
        availabilityStatus: 'active',
        isActive: true,
        averageRating: Number((3.6 + Math.random() * 1.3).toFixed(1)),
        numReviews: 5 + Math.floor(Math.random() * 180),
        discountPercent: hasDiscount ? pick([10, 15, 20, 25, 30]) : 0,
        unitsRented: 3 + Math.floor(Math.random() * 220),
      });
      seq++;
    }
  }

  const inserted = await Product.insertMany(products);

  const inventoryDocs = [];
  for (const product of inserted) {
    const assets = await generateInventoryAssets(product.sku);
    inventoryDocs.push({
      product: product._id,
      serialNumber: assets.serialNumber,
      qrCodeUrl: assets.qrCodeUrl,
      barcodeUrl: assets.barcodeUrl,
      status: INVENTORY_STATUS.AVAILABLE,
      city: product.city,
      purchaseDate: new Date(),
    });
  }
  await InventoryItem.insertMany(inventoryDocs);

  return inserted;
}

// Real Order/OrderItem/Payment documents against the new vendor's own products so Customer
// Orders, Rental Requests (both client-synthesized from real products — see
// frontend/lib/mockVendorData.js), and the real backend-aggregated Dashboard stats + Delivery
// Partner Management screens (vendor.controller.js's getMyStats/listDeliveryPartners, both
// scoped by `vendor: vendor._id`) all show genuine, non-empty, vendor-specific activity from
// the moment this vendor is approved — not Demo Vendor's data, and not a blank dashboard.
async function generateVendorOrders(vendor, products) {
  if (!products.length) return;

  const [customers, rentalPlans, cityDoc, cityPartners] = await Promise.all([
    User.find({ role: 'customer' }).select('_id name phone').limit(40),
    RentalPlan.find({}),
    City.findById(vendor.city).select('name state'),
    DeliveryPartner.find({ assignedCity: vendor.city }),
  ]);
  if (!customers.length || !rentalPlans.length) return;

  const cityName = cityDoc?.name || 'Hyderabad';
  const stateName = cityDoc?.state || 'Telangana';
  const planByDuration = Object.fromEntries(rentalPlans.map((p) => [p.durationMonths, p]));
  const hasPartnerCoverage = cityPartners.length > 0;

  const orderCount = 12 + Math.floor(Math.random() * 13); // 12-24 orders
  let seeded = 0;

  for (let i = 0; i < orderCount; i++) {
    const product = pick(products);
    const plan = planByDuration[pick([1, 3, 6, 12])] || rentalPlans[0];
    const customer = pick(customers);
    const addr = pick(DELIVERY_ADDRESSES);
    const partner = hasPartnerCoverage ? pick(cityPartners) : null;

    // Randomized per-vendor lifecycle mix — different proportions than Demo Vendor's fixed
    // scenario list, and skewed toward earlier stages entirely when no delivery partner
    // covers this vendor's city (nothing can realistically have been picked up/delivered yet).
    const roll = Math.random();
    let status;
    if (!hasPartnerCoverage) {
      status = roll < 0.55 ? ORDER_ITEM_STATUS.PENDING : ORDER_ITEM_STATUS.CONFIRMED;
    } else if (roll < 0.18) status = ORDER_ITEM_STATUS.PENDING;
    else if (roll < 0.32) status = ORDER_ITEM_STATUS.CONFIRMED;
    else if (roll < 0.45) status = ORDER_ITEM_STATUS.PREPARING;
    else if (roll < 0.55) status = ORDER_ITEM_STATUS.OUT_FOR_DELIVERY;
    else status = ORDER_ITEM_STATUS.ACTIVE_RENTAL;

    const daysAgo = Math.floor(Math.random() * 45);
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - daysAgo);

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const gstAmount = Math.round(monthlyRentalPrice * 0.18);
    const grandTotalDue = monthlyRentalPrice + product.securityDeposit + product.deliveryCharge + gstAmount;

    const order = await Order.create({
      orderNumber: `V${vendor._id.toString().slice(-5).toUpperCase()}${Date.now().toString(36).toUpperCase()}${i}`,
      customer: customer._id,
      city: vendor.city,
      deliveryAddress: {
        contactName: customer.name,
        contactPhone: customer.phone || '9000000001',
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
      status: status === ORDER_ITEM_STATUS.PENDING ? ORDER_STATUS.PENDING : ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentMethod: pick(Object.values(PAYMENT_METHOD)),
      placedAt,
      createdAt: placedAt,
    });

    const plainOtp = String(1000 + Math.floor(Math.random() * 9000));
    const statusHistory = [{ status: ORDER_ITEM_STATUS.PENDING, changedAt: placedAt, note: 'Order placed and paid.' }];
    if (status !== ORDER_ITEM_STATUS.PENDING) statusHistory.push({ status: ORDER_ITEM_STATUS.CONFIRMED, changedAt: placedAt, note: 'Confirmed by vendor.' });
    if (partner && status !== ORDER_ITEM_STATUS.PENDING && status !== ORDER_ITEM_STATUS.CONFIRMED) {
      statusHistory.push({ status: ORDER_ITEM_STATUS.PREPARING, changedAt: placedAt, note: 'Accepted by delivery partner.' });
    }

    const assignedPartner = status === ORDER_ITEM_STATUS.PENDING || status === ORDER_ITEM_STATUS.CONFIRMED ? null : partner;
    const deliveryFee = assignedPartner ? 60 + Math.round(product.deliveryCharge * 0.5) : 0;
    const review = status === ORDER_ITEM_STATUS.ACTIVE_RENTAL ? pick(DELIVERY_REVIEWS) : null;

    const itemFields = {
      order: order._id,
      vendor: vendor._id,
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
      statusHistory,
      deliveryPartner: assignedPartner ? assignedPartner._id : null,
      deliveryFee,
    };

    if (status === ORDER_ITEM_STATUS.OUT_FOR_DELIVERY || status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) {
      itemFields.pickedUpAt = new Date(placedAt.getTime() + 2 * 60 * 60 * 1000);
    }
    if (status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) {
      const deliveredAt = new Date(placedAt.getTime() + 26 * 60 * 60 * 1000);
      itemFields.deliveredAt = deliveredAt;
      itemFields.rentalStartDate = deliveredAt;
      const end = new Date(deliveredAt);
      end.setMonth(end.getMonth() + plan.durationMonths);
      itemFields.rentalEndDate = end;
      itemFields.deliveryRating = review.rating;
      itemFields.deliveryReviewComment = review.comment;
      itemFields.deliveryReviewDate = deliveredAt;
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

    if (assignedPartner && status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) {
      await DeliveryPartner.findByIdAndUpdate(assignedPartner._id, { $inc: { totalDeliveries: 1, totalEarnings: deliveryFee } });
    }

    seeded++;
  }

  return seeded;
}

const NOTIFICATION_TEMPLATES = [
  { type: 'order', status: 'Placed', title: 'New rental order', verb: 'placed a new order for' },
  { type: 'order', status: 'Confirmed', title: 'Order confirmed', verb: 'order confirmed for' },
  { type: 'payment', status: 'Paid', title: 'Payment received', verb: 'completed payment for' },
  { type: 'maintenance', status: 'Requested', title: 'Maintenance requested', verb: 'requested maintenance for' },
  { type: 'order', status: 'Extension Requested', title: 'Extension requested', verb: 'requested a rental extension for' },
  { type: 'system', status: 'Review Submitted', title: 'New review', verb: 'left a review for' },
  { type: 'order', status: 'Delivered', title: 'Order delivered', verb: 'confirmed delivery of' },
];

async function generateVendorNotifications(vendorUserId, products) {
  if (!products.length) return;
  const customerNames = ['Aarav Mehta', 'Ishita Rao', 'Kabir Singh', 'Ritika Nair', 'Yash Kulkarni', 'Sana Sheikh', 'Devika Pillai'];

  const docs = shuffle(NOTIFICATION_TEMPLATES).map((tpl, i) => {
    const product = pick(products);
    const customerName = pick(customerNames);
    const orderNumber = `ORD-2026-${(1000 + Math.floor(Math.random() * 8999)).toString()}`;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - i * 2 - Math.floor(Math.random() * 2));

    return {
      user: vendorUserId,
      title: tpl.title,
      message: `${customerName} ${tpl.verb} ${product.name}.`,
      type: tpl.type,
      channels: ['in_app'],
      isRead: i > 3,
      relatedEntity: { type: 'product', id: product._id },
      meta: { customerName, productName: product.name, orderNumber, status: tpl.status },
      createdAt,
    };
  });

  await Notification.insertMany(docs);
}

// Entry point, called once a Vendor application is approved (admin.controller.js's
// approveVendor). Populates a real, independent-looking business — own product catalog, own
// order history, own notifications — so the vendor's dashboard is genuinely theirs from the
// first login rather than either empty or (via a stale frontend cache) showing Demo Vendor's
// data. Guarded so re-approving an already-populated vendor (e.g. reject -> re-approve) never
// duplicates data.
async function generateVendorDemoData(vendor) {
  const existing = await Product.countDocuments({ vendor: vendor._id });
  if (existing > 0) return { products: existing, skipped: true };

  const products = await generateVendorProducts(vendor);
  const orderCount = await generateVendorOrders(vendor, products);
  await generateVendorNotifications(vendor.user, products);

  logger.success(
    `Onboarded vendor "${vendor.businessName}": ${products.length} products, ${orderCount || 0} orders, notifications seeded.`
  );
  return { products: products.length, orders: orderCount || 0 };
}

module.exports = { generateVendorDemoData };
