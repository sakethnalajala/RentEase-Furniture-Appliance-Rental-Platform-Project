const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const seed = require('../seed');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const Address = require('../models/Address');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');

const router = express.Router();

// Matches the throwaway account-name patterns this repo's own verification passes use (e.g.
// "Verify Test Customer <rand>") — never a real user's chosen name.
const TEST_ACCOUNT_NAME_PATTERN = /\b(prod\s*(sync|city)?\s*test|sync\s*test|city\s*(fix\s*)?test|verify\s*test|curl\s*test|regression\s*(customer|vendor|delivery))\b/i;

// One-off production database seeding, reachable over HTTP since a serverless deployment has
// no shell access to run `npm run seed` directly against its own database. Guarded by a shared
// secret (SEED_SECRET) rather than the normal JWT+RBAC admin auth, since this must be callable
// before any admin account exists in a fresh database. Requires DEMO_MODE=true (this seeds demo
// accounts/data — never intended to run against a real production dataset) and a configured
// SEED_SECRET (unset by default, so this route 404s as "not found" rather than 403 on any
// deployment that hasn't deliberately opted in, avoiding advertising its existence).
router.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.SEED_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-seed-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    await seed();
    new ApiResponse(200, null, 'Seed complete.').send(res);
  })
);

// Temporary, one-off purge of throwaway test accounts created while verifying this deployment
// (see TEST_ACCOUNT_NAME_PATTERN above). Same shared-secret gating pattern as /seed. `?dryRun=
// true` lists what would be deleted without deleting anything — always run that first. Cascades
// each matched account's own personal data and any Orders/OrderItems/Payments it placed, so
// Vendor/Admin views don't end up with dangling references. Removed again once used.
router.post(
  '/cleanup-test-accounts',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.CLEANUP_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-cleanup-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    const dryRun = req.query.dryRun === 'true';
    const matches = await User.find({ isDemoSeed: false, name: TEST_ACCOUNT_NAME_PATTERN }).select('_id name email role');

    if (dryRun) {
      return new ApiResponse(200, { count: matches.length, accounts: matches }).send(res);
    }

    const summary = { deletedUsers: [], deletedOrders: 0, deletedOrderItems: 0, deletedPayments: 0 };

    for (const user of matches) {
      if (user.role === 'customer') {
        const orders = await Order.find({ customer: user._id }).select('_id');
        const orderIds = orders.map((o) => o._id);
        if (orderIds.length) {
          const itemsRes = await OrderItem.deleteMany({ order: { $in: orderIds } });
          const paymentsRes = await Payment.deleteMany({ order: { $in: orderIds } });
          const ordersRes = await Order.deleteMany({ _id: { $in: orderIds } });
          summary.deletedOrderItems += itemsRes.deletedCount || 0;
          summary.deletedPayments += paymentsRes.deletedCount || 0;
          summary.deletedOrders += ordersRes.deletedCount || 0;
        }
        await Promise.all([
          Address.deleteMany({ user: user._id }),
          Cart.deleteMany({ user: user._id }),
          Wishlist.deleteMany({ user: user._id }),
        ]);
      } else if (user.role === 'vendor') {
        await Vendor.deleteMany({ user: user._id });
      } else if (user.role === 'delivery_partner') {
        // This role can also be the deliveryPartner assigned to OTHER customers' real
        // OrderItems (exactly what this verification pass just exercised) — unassign rather
        // than leave a dangling ref before the DeliveryPartner document itself is removed.
        const partner = await DeliveryPartner.findOne({ user: user._id }).select('_id');
        if (partner) {
          await OrderItem.updateMany(
            { deliveryPartner: partner._id },
            { $set: { deliveryPartner: null, deliveryAssignedAt: null, status: 'confirmed' }, $push: { statusHistory: { status: 'confirmed', note: 'Delivery partner account removed; request reopened.' } } }
          );
        }
        await DeliveryPartner.deleteMany({ user: user._id });
      }

      await Notification.deleteMany({ user: user._id });
      await User.deleteOne({ _id: user._id });
      summary.deletedUsers.push({ name: user.name, email: user.email, role: user.role });
    }

    new ApiResponse(200, summary, `Removed ${summary.deletedUsers.length} test account(s).`).send(res);
  })
);

module.exports = router;
