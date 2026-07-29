const crypto = require('crypto');
const mongoose = require('mongoose');
const qrcode = require('qrcode');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const RentalPlan = require('../models/RentalPlan');
const InventoryItem = require('../models/InventoryItem');
const Cart = require('../models/Cart');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const User = require('../models/User');
const City = require('../models/City');
const Notification = require('../models/Notification');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS, NON_CANCELLABLE_STATUSES } = require('../constants/orderStatus');
const { INVENTORY_STATUS, VENDOR_STATUS } = require('../constants/inventoryStatus');
const { ROLES } = require('../constants/roles');

// $match (unlike .find()) does not auto-cast string ids to ObjectId, so any aggregation/filter
// built from req.query needs this explicitly. OrderItem has no city field of its own (the Order
// it belongs to does), so city-scoping it means first resolving which Orders were placed in that
// city, then filtering on `order: { $in: orderIds }` — same pattern as admin.controller.js.
const toObjectId = (id) => new mongoose.Types.ObjectId(id);
async function orderIdsForCity(cityId) {
  if (!cityId) return null;
  const orders = await Order.find({ city: toObjectId(cityId) }).select('_id');
  return orders.map((o) => o._id);
}

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const generateFourDigitOtp = () => crypto.randomInt(1000, 10000).toString();
const generateOrderNumber = () =>
  `RE${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
const generateInvoiceNumber = () =>
  `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}${crypto.randomInt(10, 99)}`;

const ORDER_ITEM_POPULATE = [
  { path: 'product', select: 'name images subCategory brand city monthlyRentalPrice securityDeposit deliveryCharge installationRequired estimatedDeliveryDays', populate: { path: 'city', select: 'name state' } },
  { path: 'rentalPlan', select: 'durationMonths label discountPercent' },
  { path: 'vendor', select: 'businessName businessAddress warehouseLocation' },
  {
    path: 'deliveryPartner',
    populate: [
      { path: 'user', select: 'name email phone avatar' },
      { path: 'assignedCity', select: 'name state' },
    ],
  },
];

// Deterministic per-entity offset (not Math.random — this needs to land on the same point
// every time the same order is re-fetched) so the vendor/customer map pins don't sit exactly
// on top of the city center when there's no real geocoded location to plot instead. Same
// spirit as delivery.controller.js's estimateDistanceKm.
function stableJitter(seed, spreadDeg = 0.035) {
  let h = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  return { dLat: Math.sin(angle) * spreadDeg, dLng: Math.cos(angle) * spreadDeg };
}

// Real coordinates where this app actually has them (a vendor's own warehouseLocation, a
// delivery partner's live currentLocation); a stable jittered point around the order's city
// center everywhere else, since neither Product.city nor Order.deliveryAddress carries real
// geocoding — same "simulated but consistent" pattern as delivery fee/distance elsewhere in
// this codebase. Powers the vendor's delivery-tracking map.
function withMapFields(item, cityDoc) {
  const cityCenter = cityDoc?.lat != null && cityDoc?.lng != null ? { lat: cityDoc.lat, lng: cityDoc.lng } : null;

  const warehouse = item.vendor?.warehouseLocation;
  const pickupJitter = stableJitter(`pickup-${item.vendor?._id || item._id}`);
  const pickupLocation =
    warehouse?.lat != null && warehouse?.lng != null
      ? { lat: warehouse.lat, lng: warehouse.lng, label: warehouse.name || item.vendor?.businessName || 'Vendor pickup point' }
      : cityCenter
        ? { lat: cityCenter.lat + pickupJitter.dLat, lng: cityCenter.lng + pickupJitter.dLng, label: item.vendor?.businessName || 'Vendor pickup point' }
        : null;

  const partnerLoc = item.deliveryPartner?.currentLocation;
  const deliveryPartnerLocation =
    partnerLoc?.lat != null && partnerLoc?.lng != null
      ? { lat: partnerLoc.lat, lng: partnerLoc.lng, label: item.deliveryPartner?.user?.name || 'Delivery partner' }
      : null;

  const customerJitter = stableJitter(`customer-${item.order?._id || item._id}`);
  const customerLocation = cityCenter
    ? {
        lat: cityCenter.lat + customerJitter.dLat,
        lng: cityCenter.lng + customerJitter.dLng,
        label: item.order?.deliveryAddress?.addressLine1 || 'Delivery address',
      }
    : null;

  // A single friendly stage name for the tracking timeline, derived from the same real
  // timestamps the Pickup/Delivery badges already use — no separate status field to keep in
  // sync.
  let deliveryStage = 'Not yet assigned';
  if (item.deliveryPartner) {
    if (item.deliveredAt) deliveryStage = 'Delivered';
    else if (item.pickedUpAt) deliveryStage = 'On the Way';
    else deliveryStage = 'Heading to Pickup';
  }

  return { ...item, pickupLocation, deliveryPartnerLocation, customerLocation, deliveryStage };
}

// A demo-but-realistic checkout: every payment method "succeeds" immediately (no real gateway
// is configured — see backend/.env.example's dev-mode-fallback pattern used across this app),
// so the Order/Payment/OrderItem records this creates are genuinely persisted and immediately
// visible to the vendor (Orders) and, once confirmed, to a delivery partner (Requests) — not a
// synthetic demo-data wrapper like the rest of the vendor dashboard's mock pipeline.
const checkout = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, paymentMethod, clearCartItemIds } = req.body;

  const productIds = items.map((i) => i.productId);
  const rentalPlanIds = [...new Set(items.map((i) => i.rentalPlanId))];

  const [products, rentalPlans] = await Promise.all([
    Product.find({ _id: { $in: productIds }, isActive: true }).populate('city', 'name'),
    RentalPlan.find({ _id: { $in: rentalPlanIds }, isActive: true }),
  ]);
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const planById = new Map(rentalPlans.map((p) => [String(p._id), p]));

  for (const line of items) {
    if (!productById.has(line.productId)) throw ApiError.notFound(`Product ${line.productId} not found.`);
    if (!planById.has(line.rentalPlanId)) throw ApiError.notFound(`Rental plan ${line.rentalPlanId} not found.`);
  }

  // A single order ships from a single city, same rule the Cart already enforces.
  const cityIds = new Set(items.map((line) => String(productById.get(line.productId).city._id)));
  if (cityIds.size > 1) {
    throw ApiError.badRequest('All items in one order must be from the same city.');
  }
  const cityId = [...cityIds][0];

  // Cash on Delivery genuinely hasn't been paid yet — every other method is a simulated
  // gateway that "succeeds" instantly (no real gateway is configured; see .env.example's
  // dev-mode-fallback pattern used across this app).
  const initialPaymentStatus = paymentMethod === 'cod' ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PAID;

  const orderNumber = generateOrderNumber();
  const order = await Order.create({
    orderNumber,
    invoiceNumber: generateInvoiceNumber(),
    customer: req.user._id,
    city: cityId,
    deliveryAddress: { ...deliveryAddress, addressLine2: deliveryAddress.addressLine2 || '' },
    items: [],
    totalMonthlyRental: 0,
    totalSecurityDeposit: 0,
    totalDeliveryCharge: 0,
    grandTotalDue: 0,
    status: ORDER_STATUS.PENDING,
    paymentStatus: initialPaymentStatus,
    paymentMethod,
  });

  let totalMonthlyRental = 0;
  let totalSecurityDeposit = 0;
  let totalDeliveryCharge = 0;
  const orderItemDocs = [];
  const plainOtpsByItemId = {};
  const vendorIdsNotified = new Set();
  const itemNotificationData = [];

  for (const line of items) {
    const product = productById.get(line.productId);
    const plan = planById.get(line.rentalPlanId);
    const quantity = line.quantity || 1;

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const securityDeposit = product.securityDeposit;
    const deliveryCharge = product.deliveryCharge || 0;

    // Best-effort allocation of a real serialized unit for this rental — not a hard
    // requirement (delivery can still proceed without one), matching InventoryItem's own
    // `default: null` on OrderItem.inventoryItem.
    const inventoryUnit = await InventoryItem.findOneAndUpdate(
      { product: product._id, status: INVENTORY_STATUS.AVAILABLE },
      { $set: { status: INVENTORY_STATUS.RESERVED } },
      { new: true }
    );

    const plainOtp = generateFourDigitOtp();

    const orderItem = await OrderItem.create({
      order: order._id,
      vendor: product.vendor,
      product: product._id,
      inventoryItem: inventoryUnit?._id || null,
      rentalPlan: plan._id,
      quantity,
      monthlyRentalPrice,
      securityDeposit,
      deliveryCharge,
      discountPercent: plan.discountPercent || 0,
      installationRequired: product.installationRequired,
      deliveryOtpHash: hashCode(plainOtp),
      deliveryOtp: plainOtp,
      // Straight to confirmed — there is no vendor approval step in this app. A successful
      // payment is the only gate an order needs; it's immediately valid and immediately an
      // open delivery request (see delivery.controller.js's OPEN_REQUEST_STATUSES).
      status: ORDER_ITEM_STATUS.CONFIRMED,
      statusHistory: [
        { status: ORDER_ITEM_STATUS.PENDING, note: 'Order placed and paid.' },
        { status: ORDER_ITEM_STATUS.CONFIRMED, note: 'Automatically confirmed after successful payment.' },
      ],
    });

    if (inventoryUnit) {
      inventoryUnit.currentOrderItem = orderItem._id;
      await inventoryUnit.save();
    }

    plainOtpsByItemId[String(orderItem._id)] = plainOtp;
    itemNotificationData.push({
      orderItemId: orderItem._id,
      productName: product.name,
      plainOtp,
      estimatedDeliveryDays: product.estimatedDeliveryDays || 3,
      itemAmount: monthlyRentalPrice * quantity + securityDeposit + deliveryCharge,
    });
    orderItemDocs.push(orderItem);

    totalMonthlyRental += monthlyRentalPrice * quantity;
    totalSecurityDeposit += securityDeposit * quantity;
    totalDeliveryCharge += deliveryCharge;

    if (product.vendor) vendorIdsNotified.add(String(product.vendor));
  }

  // 18% GST on the rental service value (delivery/deposit are not taxed here), same rate used
  // across Indian rental/subscription marketplaces — shown as a distinct line at checkout.
  const gstAmount = Math.round(totalMonthlyRental * 0.18);
  const grandTotalDue = totalMonthlyRental + totalSecurityDeposit + totalDeliveryCharge + gstAmount;

  order.items = orderItemDocs.map((i) => i._id);
  order.totalMonthlyRental = totalMonthlyRental;
  order.totalSecurityDeposit = totalSecurityDeposit;
  order.totalDeliveryCharge = totalDeliveryCharge;
  order.grandTotalDue = grandTotalDue;
  await order.save();

  await Payment.create({
    order: order._id,
    user: req.user._id,
    amount: grandTotalDue,
    method: paymentMethod,
    status: initialPaymentStatus,
    type: 'rental',
  });

  if (clearCartItemIds?.length) {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      clearCartItemIds.forEach((id) => cart.items.pull({ _id: id }));
      await cart.save();
    }
  }

  await Promise.all(
    [...vendorIdsNotified].map(async (vendorId) => {
      const vendor = await Vendor.findById(vendorId).select('user businessName');
      if (!vendor) return;
      await Notification.create({
        user: vendor.user,
        title: 'New rental order received',
        message: `New order received from ${req.user.name}.\nOrder ID: ${orderNumber}`,
        type: 'order',
        relatedEntity: { type: 'Order', id: order._id },
        meta: { orderNumber, customerName: req.user.name },
      });
    })
  );

  // Admin visibility — every admin account sees every new order/payment platform-wide, same as
  // the existing Admin Orders/Payments pages already aggregate across all vendors/customers.
  const admins = await User.find({ role: ROLES.ADMIN }).select('_id');
  await Promise.all(
    admins.flatMap((admin) => [
      Notification.create({
        user: admin._id,
        title: 'New Order',
        message: `${req.user.name} placed a new order.\nOrder ID: ${orderNumber}`,
        type: 'order',
        relatedEntity: { type: 'Order', id: order._id },
        meta: { orderNumber, customerName: req.user.name },
      }),
      initialPaymentStatus === PAYMENT_STATUS.PAID
        ? Notification.create({
            user: admin._id,
            title: 'Payment Received',
            message: `Payment of ₹${grandTotalDue.toLocaleString('en-IN')} received for order ${orderNumber}.`,
            type: 'payment',
            relatedEntity: { type: 'Order', id: order._id },
            meta: { orderNumber, amount: grandTotalDue },
          })
        : null,
    ].filter(Boolean))
  );

  // Every item just went straight to an open delivery request the moment it was created above
  // (see delivery.controller.js's findOpenRequestsInCity — pending items in this city are
  // already visible there) — let every approved delivery partner assigned to this city know
  // right away rather than leaving them to discover it only by refreshing Requests.
  if (orderItemDocs.length) {
    const cityPartners = await DeliveryPartner.find({ assignedCity: cityId, status: VENDOR_STATUS.APPROVED }).select('user');
    await Promise.all(
      cityPartners.map((partner) =>
        Notification.create({
          user: partner.user,
          title: 'New delivery request available',
          message: 'New delivery request available.',
          type: 'delivery',
          relatedEntity: { type: 'Order', id: order._id },
          meta: { orderNumber },
        })
      )
    );
  }

  // A full set of distinct notifications per item — not one consolidated message — so the
  // customer's Notifications portal shows the same granular trail a real marketplace would:
  // the order being placed, payment clearing, the rental being confirmed, the delivery OTP
  // being generated, and the estimated delivery window, each as its own titled, timestamped,
  // markable-as-read card. ("Delivery Partner Assigned" is the other notification in this
  // trail — it fires later, from delivery.controller.js's acceptRequest, since it describes an
  // event that hasn't happened yet at checkout time.) All persisted as real Notification
  // documents, so they survive past the checkout success screen and across logout/login.
  const paymentMethodLabels = {
    upi: 'UPI', credit_card: 'Credit Card', debit_card: 'Debit Card', net_banking: 'Net Banking', cod: 'Cash on Delivery',
  };
  const paymentMethodLabel = paymentMethodLabels[paymentMethod] || paymentMethod;

  await Promise.all(
    itemNotificationData.flatMap((info) => {
      const estimatedDeliveryDate = new Date(Date.now() + info.estimatedDeliveryDays * 24 * 60 * 60 * 1000);
      const baseMeta = { orderNumber, productName: info.productName, orderItemId: info.orderItemId };

      return [
        Notification.create({
          user: req.user._id,
          title: 'Order Successfully Placed',
          message: `Your order for ${info.productName} has been placed successfully.\nOrder ID: ${orderNumber}`,
          type: 'order',
          relatedEntity: { type: 'OrderItem', id: info.orderItemId },
          meta: { ...baseMeta, status: 'Placed' },
        }),
        initialPaymentStatus === PAYMENT_STATUS.PAID
          ? Notification.create({
              user: req.user._id,
              title: 'Payment Successful',
              message: `Your payment of ₹${info.itemAmount.toLocaleString('en-IN')} for ${info.productName} was successful via ${paymentMethodLabel}.\nOrder ID: ${orderNumber}`,
              type: 'payment',
              relatedEntity: { type: 'OrderItem', id: info.orderItemId },
              meta: { ...baseMeta, status: 'Paid', amount: info.itemAmount, paymentMethod },
            })
          : null,
        Notification.create({
          user: req.user._id,
          title: 'Rental Confirmed',
          message: `Your rental for ${info.productName} has been confirmed and is being prepared for dispatch.\nOrder ID: ${orderNumber}`,
          type: 'order',
          relatedEntity: { type: 'OrderItem', id: info.orderItemId },
          meta: { ...baseMeta, status: 'Confirmed' },
        }),
        Notification.create({
          user: req.user._id,
          title: 'Delivery OTP Generated',
          message: `Your rental has been confirmed.\nOrder ID: ${orderNumber}\nDelivery OTP: ${info.plainOtp}\nEstimated Delivery: ${info.estimatedDeliveryDays} Day${info.estimatedDeliveryDays === 1 ? '' : 's'}\nPlease show this OTP to the Delivery Partner during delivery.`,
          type: 'delivery',
          relatedEntity: { type: 'OrderItem', id: info.orderItemId },
          meta: { ...baseMeta, status: 'OTP Generated', deliveryOtp: info.plainOtp, estimatedDeliveryDays: info.estimatedDeliveryDays },
        }),
        Notification.create({
          user: req.user._id,
          title: 'Estimated Delivery Date',
          message: `${info.productName} is expected to be delivered by ${estimatedDeliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} (within ${info.estimatedDeliveryDays} day${info.estimatedDeliveryDays === 1 ? '' : 's'}).\nOrder ID: ${orderNumber}`,
          type: 'delivery',
          relatedEntity: { type: 'OrderItem', id: info.orderItemId },
          meta: { ...baseMeta, status: 'Scheduled', estimatedDeliveryDays: info.estimatedDeliveryDays, estimatedDeliveryDate },
        }),
      ].filter(Boolean);
    })
  );

  const populatedItems = await OrderItem.find({ order: order._id }).populate(ORDER_ITEM_POPULATE);

  new ApiResponse(
    201,
    {
      order,
      items: populatedItems.map((item) => ({
        ...item.toObject(),
        deliveryOtp: plainOtpsByItemId[String(item._id)],
      })),
    },
    'Payment successful — your rental is confirmed.'
  ).send(res);
});

const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'items', populate: ORDER_ITEM_POPULATE })
    .lean();
  new ApiResponse(200, orders).send(res);
});

const listMyOrderItems = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const orders = await Order.find({ customer: req.user._id }).select('_id orderNumber placedAt').lean();
  const orderIds = orders.map((o) => o._id);
  const orderById = new Map(orders.map((o) => [String(o._id), o]));

  const filter = { order: { $in: orderIds } };
  if (status) filter.status = status;

  const items = await OrderItem.find(filter).sort({ createdAt: -1 }).populate(ORDER_ITEM_POPULATE).lean();
  new ApiResponse(
    200,
    items.map((item) => ({ ...item, order: orderById.get(String(item.order)) }))
  ).send(res);
});

// Powers the customer-facing Payment History / Invoices pages — real Payment documents (one
// per order, created at checkout) rather than the mock data those pages used to run on.
const listMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'order',
      select: 'orderNumber invoiceNumber totalMonthlyRental totalSecurityDeposit items',
      populate: { path: 'items', populate: ORDER_ITEM_POPULATE },
    })
    .lean();
  new ApiResponse(200, payments).send(res);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .populate({ path: 'items', populate: ORDER_ITEM_POPULATE })
    .lean();
  if (!order) throw ApiError.notFound('Order not found.');
  new ApiResponse(200, order).send(res);
});

const cancelOrderItem = asyncHandler(async (req, res) => {
  const item = await OrderItem.findById(req.params.itemId);
  if (!item) throw ApiError.notFound('Order item not found.');

  const order = await Order.findOne({ _id: item.order, customer: req.user._id });
  if (!order) throw ApiError.forbidden('This order item does not belong to you.');

  if (NON_CANCELLABLE_STATUSES.includes(item.status)) {
    throw ApiError.badRequest(`This item can no longer be cancelled (status: ${item.status}).`);
  }

  item.status = ORDER_ITEM_STATUS.CANCELLED;
  item.cancelReason = req.body?.reason || 'Cancelled by customer.';
  item.statusHistory.push({ status: ORDER_ITEM_STATUS.CANCELLED, note: item.cancelReason });
  await item.save();

  if (item.inventoryItem) {
    await InventoryItem.findByIdAndUpdate(item.inventoryItem, {
      $set: { status: INVENTORY_STATUS.AVAILABLE, currentOrderItem: null },
    });
  }

  new ApiResponse(200, item, 'Order item cancelled.').send(res);
});

// ---- Vendor side ----

const listVendorOrderItems = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');

  const filter = { vendor: vendor._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.city) filter.order = { $in: await orderIdsForCity(req.query.city) };

  const items = await OrderItem.find(filter)
    .sort({ createdAt: -1 })
    .populate(ORDER_ITEM_POPULATE)
    .populate({
      path: 'order',
      select: 'orderNumber invoiceNumber customer deliveryAddress placedAt paymentStatus paymentMethod city',
      populate: [
        { path: 'customer', select: 'name email phone' },
        { path: 'city', select: 'name state lat lng' },
      ],
    })
    .lean();

  const withMaps = items.map((item) => withMapFields(item, item.order?.city));
  new ApiResponse(200, withMaps).send(res);
});

// A scannable (but non-functional — no real bank sits behind it) UPI intent QR for the demo
// checkout's UPI payment step. Reuses the same `qrcode` package already used to render
// InventoryItem QR codes at seed time, so no new dependency.
const getDemoUpiQr = asyncHandler(async (req, res) => {
  const amount = Number(req.query.amount) || 0;
  const upiId = 'rentease.demo@okhdfcbank';
  const intent = `upi://pay?pa=${upiId}&pn=RentEase&am=${amount.toFixed(2)}&cu=INR&tn=RentEase%20Rental%20Payment`;
  const qrDataUrl = await qrcode.toDataURL(intent, { margin: 1, width: 260 });
  new ApiResponse(200, { qrDataUrl, upiId, amount }).send(res);
});

module.exports = {
  checkout,
  getDemoUpiQr,
  listMyOrders,
  listMyOrderItems,
  listMyPayments,
  getOrder,
  cancelOrderItem,
  listVendorOrderItems,
};
