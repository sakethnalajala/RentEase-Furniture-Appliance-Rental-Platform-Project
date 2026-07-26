const logger = require('../utils/logger');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Notification = require('../models/Notification');
const RefreshToken = require('../models/RefreshToken');
const { ROLES } = require('../constants/roles');
const { DEMO_ACCOUNTS } = require('../constants/demoAccounts');

// Matches the ad-hoc accounts created by automated registration testing during development
// (Playwright scripts, curl smoke tests) — never a genuine seed.js filler account (isDemoSeed
// is always excluded below) and never one of the four canonical Demo Accounts.
const TEST_PATTERNS = [
  /test\.com$/i,
  /curltest/i,
  /^test\s/i,
  /^prod\s?test/i,
  /^prod\s?(customer|vendor|delivery)/i,
  /^qa\s/i,
  /^debug\s/i,
  /^verify\s?test/i,
  /^verify\d/i,
  /^temporary\s/i,
  /^verification\s/i,
];

function isTestAccount(user) {
  if (user.isDemoSeed) return false;
  const canonicalEmails = new Set(Object.values(DEMO_ACCOUNTS).map((a) => a.email));
  if (canonicalEmails.has(user.email)) return false;
  return TEST_PATTERNS.some((re) => re.test(user.email) || re.test(user.name || ''));
}

// One-time hard-delete of ad-hoc test accounts (and everything they own) from all three
// self-registerable roles, run once via the SEED_SECRET-gated /system/cleanup-test-accounts
// route. Never touches seed.js-authored demo/filler data (isDemoSeed: true) or the four
// canonical Demo Accounts — those stay exactly as-is.
async function cleanupTestAccounts({ dryRun = false } = {}) {
  const candidates = await User.find({
    role: { $in: [ROLES.CUSTOMER, ROLES.VENDOR, ROLES.DELIVERY_PARTNER] },
    isDemoSeed: false,
  }).select('name email role');

  const testUsers = candidates.filter(isTestAccount);
  const summary = { usersDeleted: 0, byRole: { customer: 0, vendor: 0, delivery_partner: 0 }, emails: [] };

  for (const user of testUsers) {
    summary.emails.push(`${user.role}:${user.email}`);
    if (dryRun) continue;

    if (user.role === ROLES.VENDOR) {
      const vendor = await Vendor.findOne({ user: user._id });
      if (vendor) {
        const products = await Product.find({ vendor: vendor._id }).select('_id');
        const productIds = products.map((p) => p._id);
        await InventoryItem.deleteMany({ product: { $in: productIds } });
        const orderItems = await OrderItem.find({ vendor: vendor._id }).select('_id order');
        const orderIds = [...new Set(orderItems.map((i) => String(i.order)))];
        await Payment.deleteMany({ order: { $in: orderIds } });
        await OrderItem.deleteMany({ vendor: vendor._id });
        await Order.deleteMany({ _id: { $in: orderIds } });
        await Product.deleteMany({ vendor: vendor._id });
        await vendor.deleteOne();
      }
    } else if (user.role === ROLES.DELIVERY_PARTNER) {
      const partner = await DeliveryPartner.findOne({ user: user._id });
      if (partner) {
        const orderItems = await OrderItem.find({ deliveryPartner: partner._id }).select('_id order');
        const orderIds = [...new Set(orderItems.map((i) => String(i.order)))];
        await Payment.deleteMany({ order: { $in: orderIds } });
        await OrderItem.deleteMany({ deliveryPartner: partner._id });
        await Order.deleteMany({ _id: { $in: orderIds } });
        await partner.deleteOne();
      }
    } else {
      // Customer
      const orders = await Order.find({ customer: user._id }).select('_id');
      const orderIds = orders.map((o) => o._id);
      await Payment.deleteMany({ order: { $in: orderIds } });
      await OrderItem.deleteMany({ order: { $in: orderIds } });
      await Order.deleteMany({ customer: user._id });
      await Wishlist.deleteMany({ user: user._id });
      await Cart.deleteMany({ user: user._id });
      await Address.deleteMany({ user: user._id });
    }

    await Notification.deleteMany({ user: user._id });
    await RefreshToken.deleteMany({ user: user._id });
    await user.deleteOne();
    summary.usersDeleted++;
    summary.byRole[user.role]++;
  }

  logger.success(`Test-account cleanup: ${summary.usersDeleted} accounts removed (${JSON.stringify(summary.byRole)}).`);
  return summary;
}

module.exports = { cleanupTestAccounts };
