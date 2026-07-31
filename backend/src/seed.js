const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const bwipjs = require('bwip-js');
const connectDB = require('./config/db');
const env = require('./config/env');
const logger = require('./utils/logger');
const City = require('./models/City');
const Category = require('./models/Category');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
const DeliveryPartner = require('./models/DeliveryPartner');
const RentalPlan = require('./models/RentalPlan');
const Product = require('./models/Product');
const InventoryItem = require('./models/InventoryItem');
const Notification = require('./models/Notification');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
const Payment = require('./models/Payment');
const Address = require('./models/Address');
const { SUPPORTED_CITIES } = require('./constants/cities');
const { ROLES } = require('./constants/roles');
const { VENDOR_STATUS, INVENTORY_STATUS } = require('./constants/inventoryStatus');
const { ORDER_ITEM_STATUS, ORDER_STATUS, PAYMENT_STATUS } = require('./constants/orderStatus');
const { DEMO_ACCOUNTS, DELIVERY_PARTNERS_BY_CITY } = require('./constants/demoAccounts');
const { generateDemoProducts } = require('./data/demoProducts');
const { DEMO_CUSTOMERS, DEMO_DELIVERY_PARTNERS, EXTRA_VENDORS, DELIVERY_REVIEWS, avatarUrl } = require('./data/demoDeliveryData');
const { generateCityCustomers, generateCityVendors, generateCityDeliveryPartners, AREA_BY_CITY } = require('./data/demoScaleData');
const { generateOpenDeliveryRequests } = require('./services/demoOrderService');

// Minimum per-city counts the Admin Customers/Vendors/Delivery-Partners portals must show —
// generated on top of the existing hand-authored demo pools (DEMO_CUSTOMERS etc., kept as-is
// since demoOrderService.js depends on DEMO_CUSTOMERS at runtime, not just at seed time).
const CUSTOMERS_PER_CITY = 50;
const VENDORS_PER_CITY = 10;
const DELIVERY_PARTNERS_PER_CITY = 12;

const VENDOR_COVER_IMAGE = 'https://images.pexels.com/photos/12706241/pexels-photo-12706241.jpeg?auto=compress&cs=tinysrgb&w=1600';

// A DeliveryPartner's `currentLocation` demo point, jittered a few km off their assigned
// city's real center so partners in the same city don't all render on the exact same spot on
// an admin map — clearly simulated data, this app has no real GPS integration.
const jitterLatLng = (city) => ({ lat: city.lat + (Math.random() - 0.5) * 0.08, lng: city.lng + (Math.random() - 0.5) * 0.08 });

const CATEGORIES = [
  { name: 'Furniture', slug: 'furniture', description: 'Beds, sofas, wardrobes, tables, chairs and more.' },
  { name: 'Appliances', slug: 'appliances', description: 'Refrigerators, washing machines, ACs, microwaves and more.' },
];

const RENTAL_PLANS = [
  { durationMonths: 1, label: '1 Month', discountPercent: 0 },
  { durationMonths: 3, label: '3 Months', discountPercent: 5 },
  { durationMonths: 6, label: '6 Months', discountPercent: 10 },
  { durationMonths: 12, label: '12 Months', discountPercent: 20 },
];

// Extra, non-approved vendor applications so the Admin "Pending Vendor Requests" screen has
// real content to review immediately instead of an empty list.
const SAMPLE_VENDOR_APPLICATIONS = [
  {
    name: 'Rohit Sharma',
    email: 'pending.vendor@rentease.com',
    businessName: 'Comfort Living Furnishings',
    city: 'Bengaluru',
    status: VENDOR_STATUS.PENDING,
    gstNumber: '29ABCDE1234F1Z5',
    panNumber: 'ABCDE1234F',
  },
  {
    name: 'Priya Nair',
    email: 'pending.vendor2@rentease.com',
    businessName: 'HomeStyle Appliances',
    city: 'Chennai',
    status: VENDOR_STATUS.PENDING,
    gstNumber: '33FGHIJ5678K1Z9',
    panNumber: 'FGHIJ5678K',
  },
  {
    name: 'Arjun Mehta',
    email: 'rejected.vendor@rentease.com',
    businessName: 'QuickRent Traders',
    city: 'Mumbai',
    status: VENDOR_STATUS.REJECTED,
    rejectionReason: 'GST certificate did not match the registered business name.',
    gstNumber: '27KLMNO9012P1Z3',
    panNumber: 'KLMNO9012P',
  },
  {
    name: 'Sunita Rao',
    email: 'suspended.vendor@rentease.com',
    businessName: 'Metro Furniture Rentals',
    city: 'Hyderabad',
    status: VENDOR_STATUS.SUSPENDED,
    gstNumber: '36PQRST3456U1Z7',
    panNumber: 'PQRST3456U',
  },
];

// Same idea as SAMPLE_VENDOR_APPLICATIONS, for Delivery Partners — real accounts in every
// non-default status so the Admin "Delivery Partners" screen's Pending/Rejected/Suspended
// filter tabs have genuine content immediately instead of always being empty (every partner
// created through normal registration defaults straight to APPROVED).
const SAMPLE_DELIVERY_PARTNER_APPLICATIONS = [
  {
    name: 'Irfan Baig',
    email: 'pending.delivery@rentease.com',
    city: 'Bengaluru',
    status: VENDOR_STATUS.PENDING,
    vehicleType: 'bike',
    vehicleNumber: 'KA05PD1234',
    licenseNumber: 'DLPEND0001',
  },
  {
    name: 'Ramesh Iyer',
    email: 'rejected.delivery@rentease.com',
    city: 'Chennai',
    status: VENDOR_STATUS.REJECTED,
    rejectionReason: 'Driving license had expired at the time of application.',
    vehicleType: 'bike',
    vehicleNumber: 'TN09RD5678',
    licenseNumber: 'DLREJ0002',
  },
  {
    name: 'Vikas Malhotra',
    email: 'suspended.delivery@rentease.com',
    city: 'Hyderabad',
    status: VENDOR_STATUS.SUSPENDED,
    vehicleType: 'van',
    vehicleNumber: 'TS10SD9012',
    licenseNumber: 'DLSUS0003',
  },
];

// Super Admin was removed as a distinct role — Admin already had identical permissions
// everywhere in this codebase, so nothing is lost by collapsing to one administrative tier.
// Any account left over from before the removal (role literally `'super_admin'`, using the raw
// string since ROLES.SUPER_ADMIN no longer exists to reference) is migrated to `admin` here,
// once, before anything else runs — same "self-heal on reseed" approach as the rest of this
// file's demo-account maintenance.
async function migrateLegacySuperAdmins() {
  const result = await User.updateMany({ role: 'super_admin' }, { $set: { role: ROLES.ADMIN } });
  if (result.modifiedCount > 0) {
    logger.warn(`Migrated ${result.modifiedCount} legacy Super Admin account(s) to Admin.`);
  }
}

// The one demo Admin account — also the "system actor" attributed as approvedBy/createdBy on
// seed-generated Vendor/RentalPlan records (a role previously served by the now-removed Super
// Admin seed account).
async function seedDemoAdmin() {
  const { admin } = DEMO_ACCOUNTS;
  const passwordHash = await bcrypt.hash(admin.password, 12);
  let user = await User.findOne({ email: admin.email });

  if (!user) {
    user = await User.create({
      name: admin.name,
      email: admin.email,
      passwordHash,
      role: ROLES.ADMIN,
      isEmailVerified: true,
      twoFactor: { mandatory: true },
      isDemoSeed: true,
    });
    logger.success(`Seeded demo Admin account: ${admin.email}`);
  } else {
    user.passwordHash = passwordHash;
    user.isDemoSeed = true;
    // Self-heal: a demo account must always be login-able — isActive/isEmailVerified can drift
    // false from an earlier "deactivate account" test run (real, self-service functionality
    // this app exposes) or manual DB edit, silently turning "wrong password" into "account
    // deactivated" on the exact same login attempt with no visible cause otherwise.
    user.isActive = true;
    user.isEmailVerified = true;
    await user.save();
    logger.info(`Demo Admin account already exists — password synced: ${admin.email}`);
  }

  return user;
}

async function seedDemoAccounts(superAdmin, citiesByName) {
  const { customer, vendor, deliveryPartner } = DEMO_ACCOUNTS;
  const hyderabad = citiesByName.Hyderabad;

  const existingDemoCustomer = await User.findOne({ email: customer.email });
  if (!existingDemoCustomer) {
    await User.create({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      passwordHash: await bcrypt.hash(customer.password, 12),
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isDemoSeed: true,
    });
    logger.success(`Seeded demo Customer account: ${customer.email}`);
  } else if (!existingDemoCustomer.isDemoSeed || !existingDemoCustomer.isActive || !existingDemoCustomer.isEmailVerified) {
    existingDemoCustomer.isDemoSeed = true;
    existingDemoCustomer.isActive = true;
    existingDemoCustomer.isEmailVerified = true;
    await existingDemoCustomer.save();
  }

  let vendorUser = await User.findOne({ email: vendor.email });
  if (!vendorUser) {
    vendorUser = await User.create({
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      passwordHash: await bcrypt.hash(vendor.password, 12),
      role: ROLES.VENDOR,
      isEmailVerified: true,
      isDemoSeed: true,
    });
    await Vendor.create({
      user: vendorUser._id,
      businessName: vendor.businessName,
      city: hyderabad._id,
      // Hyderabad stays the primary/home city, but this account genuinely fulfils orders in
      // every other city too (see seedProducts's vendorPoolByCity) — reflected here so
      // Vendor Profile shows the truth, not just an implicit product-assignment side effect.
      operatingCities: Object.entries(citiesByName)
        .filter(([name]) => name !== 'Hyderabad')
        .map(([, c]) => c._id),
      status: VENDOR_STATUS.APPROVED,
      approvedBy: superAdmin._id,
      approvedAt: new Date(),
      coverImage: VENDOR_COVER_IMAGE,
    });
    logger.success(`Seeded demo Vendor account (pre-approved): ${vendor.email}`);
  } else {
    await Vendor.updateOne({ user: vendorUser._id, coverImage: '' }, { $set: { coverImage: VENDOR_COVER_IMAGE } });
    if (!vendorUser.isDemoSeed || !vendorUser.isActive || !vendorUser.isEmailVerified) {
      vendorUser.isDemoSeed = true;
      // Self-heal: isActive/isEmailVerified can drift false from an earlier "deactivate
      // account" test run or manual DB edit, silently turning "wrong password" into "account
      // deactivated" on the exact same login attempt with no visible cause otherwise. A demo
      // account must always be login-able.
      vendorUser.isActive = true;
      vendorUser.isEmailVerified = true;
      await vendorUser.save();
    }
    // Self-heal: backfill operatingCities on an already-existing account from before this was set.
    await Vendor.updateOne(
      { user: vendorUser._id, operatingCities: { $size: 0 } },
      { $set: { operatingCities: Object.entries(citiesByName).filter(([name]) => name !== 'Hyderabad').map(([, c]) => c._id) } }
    );
    // Self-heal: force the demo Vendor's own approval status back to APPROVED — it can drift to
    // rejected/suspended from an earlier Admin Vendor Management test run against this exact
    // account, which would otherwise silently keep blocking every future demo login.
    await Vendor.updateOne(
      { user: vendorUser._id, status: { $ne: VENDOR_STATUS.APPROVED } },
      { $set: { status: VENDOR_STATUS.APPROVED, approvedBy: superAdmin._id, approvedAt: new Date(), rejectionReason: '' } }
    );
  }

  const existingDemoDeliveryUser = await User.findOne({ email: deliveryPartner.email });
  if (!existingDemoDeliveryUser) {
    const deliveryUser = await User.create({
      name: deliveryPartner.name,
      email: deliveryPartner.email,
      phone: deliveryPartner.phone,
      passwordHash: await bcrypt.hash(deliveryPartner.password, 12),
      role: ROLES.DELIVERY_PARTNER,
      isEmailVerified: true,
      isDemoSeed: true,
      selectedCity: hyderabad._id,
    });
    await DeliveryPartner.create({
      user: deliveryUser._id,
      vehicleType: deliveryPartner.vehicleType,
      vehicleNumber: deliveryPartner.vehicleNumber,
      licenseNumber: deliveryPartner.licenseNumber,
      assignedCity: hyderabad._id,
      area: (AREA_BY_CITY.Hyderabad || [])[0] || '',
      currentLocation: jitterLatLng(hyderabad),
    });
    logger.success(`Seeded demo Delivery Partner account: ${deliveryPartner.email}`);
  } else {
    if (!existingDemoDeliveryUser.isDemoSeed || !existingDemoDeliveryUser.isActive || !existingDemoDeliveryUser.isEmailVerified) {
      existingDemoDeliveryUser.isDemoSeed = true;
      existingDemoDeliveryUser.isActive = true;
      existingDemoDeliveryUser.isEmailVerified = true;
      await existingDemoDeliveryUser.save();
    }
    // Self-heal: backfill `area` on an already-existing account from before this field existed.
    await DeliveryPartner.updateOne(
      { user: existingDemoDeliveryUser._id, $or: [{ area: { $exists: false } }, { area: '' }] },
      { $set: { area: (AREA_BY_CITY.Hyderabad || [])[0] || '' } }
    );
    // Self-heal: force this demo account's own approval status back to APPROVED — it can drift
    // from an earlier Admin test run against this exact account, silently blocking future logins.
    await DeliveryPartner.updateOne(
      { user: existingDemoDeliveryUser._id, status: { $ne: VENDOR_STATUS.APPROVED } },
      { $set: { status: VENDOR_STATUS.APPROVED, rejectionReason: '' } }
    );
    // Self-heal: force selectedCity back to Hyderabad on an already-existing account — it can
    // drift (e.g. a live browser session picking a different city anywhere the header
    // CitySelector is reachable while logged into this account, which persists to
    // User.selectedCity same as any other account), and a stale value here makes the header
    // CitySelector show the wrong city for this account on next login even though its real
    // DeliveryPartner.assignedCity never changes. delivery/layout.js also self-corrects this
    // live for the currently open session; this keeps a fresh login clean too.
    if (String(existingDemoDeliveryUser.selectedCity || '') !== String(hyderabad._id)) {
      existingDemoDeliveryUser.selectedCity = hyderabad._id;
      await existingDemoDeliveryUser.save();
    }
  }

  // Sample pending/rejected vendor applications for the Admin approval queue.
  for (const app of SAMPLE_VENDOR_APPLICATIONS) {
    const existingApp = await User.findOne({ email: app.email });
    if (existingApp) {
      if (!existingApp.isDemoSeed) {
        existingApp.isDemoSeed = true;
        await existingApp.save();
      }
      continue;
    }

    const passwordHash = await bcrypt.hash('Demo@1234', 12);
    const user = await User.create({
      name: app.name,
      email: app.email,
      passwordHash,
      role: ROLES.VENDOR,
      isEmailVerified: true,
      isDemoSeed: true,
    });
    await Vendor.create({
      user: user._id,
      businessName: app.businessName,
      city: citiesByName[app.city]._id,
      status: app.status,
      gstNumber: app.gstNumber,
      panNumber: app.panNumber,
      rejectionReason: app.rejectionReason || '',
    });
    logger.success(`Seeded sample vendor application (${app.status}): ${app.businessName}`);
  }

  // Same idea, for Delivery Partners — see SAMPLE_DELIVERY_PARTNER_APPLICATIONS's own comment.
  for (const app of SAMPLE_DELIVERY_PARTNER_APPLICATIONS) {
    const existingApp = await User.findOne({ email: app.email });
    if (existingApp) {
      if (!existingApp.isDemoSeed) {
        existingApp.isDemoSeed = true;
        await existingApp.save();
      }
      continue;
    }

    const appCity = citiesByName[app.city];
    const passwordHash = await bcrypt.hash('Demo@1234', 12);
    const user = await User.create({
      name: app.name,
      email: app.email,
      passwordHash,
      role: ROLES.DELIVERY_PARTNER,
      isEmailVerified: true,
      isDemoSeed: true,
    });
    await DeliveryPartner.create({
      user: user._id,
      vehicleType: app.vehicleType,
      vehicleNumber: app.vehicleNumber,
      licenseNumber: app.licenseNumber,
      assignedCity: appCity._id,
      status: app.status,
      rejectionReason: app.rejectionReason || '',
      currentLocation: jitterLatLng(appCity),
    });
    logger.success(`Seeded sample delivery partner application (${app.status}): ${app.name}`);
  }

  return { demoVendor: await Vendor.findOne({ user: vendorUser._id }), vendorUser };
}

// 15 additional named customer accounts — real Users, not just display strings — so orders,
// delivery requests, messages and reviews stop uniformly showing "Demo Customer" everywhere.
// They can't log in through a demo tile (only demo.customer@rentease.com is advertised as
// such), but they're fully real accounts the seeded/auto-generated order pipeline draws from.
async function seedExtraCustomers() {
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const created = [];
  for (const c of DEMO_CUSTOMERS) {
    let user = await User.findOne({ email: c.email });
    if (!user) {
      user = await User.create({
        name: c.name,
        email: c.email,
        phone: c.phone,
        passwordHash,
        role: ROLES.CUSTOMER,
        isEmailVerified: true,
        avatar: c.avatar,
        isDemoSeed: true,
      });
    } else if (user.avatar !== c.avatar || !user.isDemoSeed) {
      user.avatar = c.avatar;
      user.isDemoSeed = true;
      await user.save();
    }
    created.push(user);
  }
  logger.success(`Seeded ${created.length} additional demo customer accounts.`);
  return created;
}

// 14 additional delivery partners (beyond the one login-able demo tile) so the vendor's
// Delivery Partner Management screen has real multi-partner variety — the large majority stay
// in Hyderabad (overlapping the demo vendor/customer's home city, so seedDemoOrders can
// realistically assign deliveries across all of them), with a handful spread across the other
// 3 cities for genuine city diversity.
async function seedExtraDeliveryPartners(citiesByName) {
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const otherCities = [citiesByName.Bengaluru, citiesByName.Chennai, citiesByName.Mumbai].filter(Boolean);
  const created = [];

  for (let i = 0; i < DEMO_DELIVERY_PARTNERS.length; i++) {
    const p = DEMO_DELIVERY_PARTNERS[i];
    // Every 4th partner (starting from the 4th) goes to a non-Hyderabad city, cycling through
    // the other 3 — keeps the large majority in Hyderabad where the rest of the demo order
    // pipeline actually operates, while still giving every other city at least one partner.
    const city = i > 0 && i % 4 === 3 ? otherCities[Math.floor(i / 4) % otherCities.length] : citiesByName.Hyderabad;

    let user = await User.findOne({ email: p.email });
    if (!user) {
      user = await User.create({
        name: p.name,
        email: p.email,
        phone: p.phone,
        passwordHash,
        role: ROLES.DELIVERY_PARTNER,
        isEmailVerified: true,
        avatar: p.avatar,
        isDemoSeed: true,
      });
    } else if (!user.isDemoSeed) {
      user.isDemoSeed = true;
      await user.save();
    }
    const joinedAt = new Date();
    joinedAt.setDate(joinedAt.getDate() - p.joinDaysAgo);

    let partner = await DeliveryPartner.findOne({ user: user._id });
    if (!partner) {
      partner = await DeliveryPartner.create({
        user: user._id,
        vehicleType: p.vehicleType,
        vehicleNumber: p.vehicleNumber,
        licenseNumber: p.licenseNumber,
        assignedCity: city._id,
        averageRating: p.rating,
        profilePhoto: p.avatar,
        isAvailable: p.isAvailable ?? true,
        isOnline: p.isOnline ?? true,
        currentLocation: jitterLatLng(city),
      });
      // Backdate createdAt (join date) directly — Mongoose only auto-populates timestamps
      // when they aren't already present on the document being created, same pattern used
      // for the backdated Notification/Order docs elsewhere in this file.
      await DeliveryPartner.updateOne({ _id: partner._id }, { $set: { createdAt: joinedAt } });
    } else {
      // Re-sync status/rating on every reseed so a change to the demo data pool (like this
      // one) actually shows up instead of freezing at whatever the first-ever seed created.
      partner.isAvailable = p.isAvailable ?? true;
      partner.isOnline = p.isOnline ?? true;
      partner.averageRating = p.rating;
      await partner.save();
    }
    created.push({ user, partner: await DeliveryPartner.findById(partner._id) });
  }
  logger.success(`Seeded ${created.length} additional demo delivery partners.`);
  return created;
}

// 3 additional small vendor accounts so delivery requests/analytics show genuine multi-vendor
// variety instead of every request being either "RentEase" or the single demo vendor. Each
// gets a slice of the regular catalog reassigned to it in seedProducts — no separate product
// generation needed.
async function seedExtraVendors(citiesByName, superAdmin) {
  const hyderabad = citiesByName.Hyderabad;
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const created = [];

  for (const v of EXTRA_VENDORS) {
    let user = await User.findOne({ email: v.email });
    if (!user) {
      user = await User.create({
        name: v.ownerName,
        email: v.email,
        phone: v.phone,
        passwordHash,
        role: ROLES.VENDOR,
        isEmailVerified: true,
        isDemoSeed: true,
      });
    } else if (!user.isDemoSeed) {
      user.isDemoSeed = true;
      await user.save();
    }
    let vendor = await Vendor.findOne({ user: user._id });
    if (!vendor) {
      vendor = await Vendor.create({
        user: user._id,
        businessName: v.businessName,
        gstNumber: v.gstNumber,
        city: hyderabad._id,
        status: VENDOR_STATUS.APPROVED,
        approvedBy: superAdmin._id,
        approvedAt: new Date(),
        coverImage: VENDOR_COVER_IMAGE,
      });
    }
    created.push(vendor);
  }
  logger.success(`Seeded ${created.length} additional demo vendor accounts.`);
  return created;
}

// Generates >=CUSTOMERS_PER_CITY real customer accounts per city, each with a real default
// Address (addressLine1/area/state/pincode) so the Admin Customers portal has genuine per-city
// volume and real address fields to display — layered on top of the 25 flat DEMO_CUSTOMERS
// (which stay untouched; demoOrderService.js reads them by name at runtime).
async function seedCityCustomers(citiesByName) {
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const cityNames = Object.keys(citiesByName);
  const byCity = {};
  let created = 0;

  for (let cityIdx = 0; cityIdx < cityNames.length; cityIdx++) {
    const cityName = cityNames[cityIdx];
    const city = citiesByName[cityName];
    const generated = generateCityCustomers(cityName, cityIdx, CUSTOMERS_PER_CITY);
    const users = [];

    for (const c of generated) {
      let user = await User.findOne({ email: c.email });
      if (!user) {
        user = await User.create({
          name: c.name,
          email: c.email,
          phone: c.phone,
          passwordHash,
          role: ROLES.CUSTOMER,
          isEmailVerified: true,
          avatar: c.avatar,
          selectedCity: city._id,
          isDemoSeed: true,
        });
        await Address.create({
          user: user._id,
          label: 'Home',
          contactName: c.name,
          contactPhone: c.phone,
          addressLine1: c.addressLine1,
          addressLine2: c.area,
          city: city._id,
          state: city.state,
          pincode: c.pincode,
          isDefault: true,
        });
        created++;
      } else if (!user.isDemoSeed) {
        user.isDemoSeed = true;
        if (!user.selectedCity) user.selectedCity = city._id;
        await user.save();
      }
      users.push(user);
    }
    byCity[cityName] = users;
  }

  logger.success(`Seeded ${created} new customers across ${cityNames.length} cities (>=${CUSTOMERS_PER_CITY}/city).`);
  return byCity;
}

// Generates >=VENDORS_PER_CITY real, pre-approved vendor accounts per city — own business
// name/GST/PAN/area/address — so the Admin Vendors portal has genuine per-city volume beyond
// the single demo vendor + 3 EXTRA_VENDORS (which stay Hyderabad-only, untouched).
async function seedCityVendors(citiesByName, superAdmin) {
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const cityNames = Object.keys(citiesByName);
  const byCity = {};
  let created = 0;

  for (let cityIdx = 0; cityIdx < cityNames.length; cityIdx++) {
    const cityName = cityNames[cityIdx];
    const city = citiesByName[cityName];
    const generated = generateCityVendors(cityName, cityIdx, VENDORS_PER_CITY);
    const vendors = [];

    for (const v of generated) {
      let user = await User.findOne({ email: v.email });
      if (!user) {
        user = await User.create({
          name: v.ownerName,
          email: v.email,
          phone: v.phone,
          passwordHash,
          role: ROLES.VENDOR,
          isEmailVerified: true,
          avatar: v.avatar,
          isDemoSeed: true,
        });
      } else if (!user.isDemoSeed) {
        user.isDemoSeed = true;
        await user.save();
      }

      let vendor = await Vendor.findOne({ user: user._id });
      if (!vendor) {
        vendor = await Vendor.create({
          user: user._id,
          businessName: v.businessName,
          gstNumber: v.gstNumber,
          panNumber: v.panNumber,
          businessAddress: v.businessAddress,
          area: v.area,
          city: city._id,
          status: VENDOR_STATUS.APPROVED,
          approvedBy: superAdmin._id,
          approvedAt: new Date(),
          coverImage: VENDOR_COVER_IMAGE,
          profilePhoto: v.avatar,
        });
        created++;
      } else if (!vendor.area) {
        vendor.area = v.area;
        await vendor.save();
      }
      vendors.push(vendor);
    }
    byCity[cityName] = vendors;
  }

  logger.success(`Seeded ${created} new vendors across ${cityNames.length} cities (>=${VENDORS_PER_CITY}/city).`);
  return byCity;
}

// Generates >=DELIVERY_PARTNERS_PER_CITY real, pre-approved delivery partners per city — own
// vehicle/license/area/simulated distance-covered — so the Admin Delivery Partners portal has
// genuine per-city volume beyond the single demo partner + the largely-Hyderabad-weighted
// DEMO_DELIVERY_PARTNERS pool (both stay untouched).
async function seedCityDeliveryPartnersScale(citiesByName) {
  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const cityNames = Object.keys(citiesByName);
  const byCity = {};
  let created = 0;

  for (let cityIdx = 0; cityIdx < cityNames.length; cityIdx++) {
    const cityName = cityNames[cityIdx];
    const city = citiesByName[cityName];
    const generated = generateCityDeliveryPartners(cityName, cityIdx, DELIVERY_PARTNERS_PER_CITY);
    const partners = [];

    for (const p of generated) {
      let user = await User.findOne({ email: p.email });
      if (!user) {
        user = await User.create({
          name: p.name,
          email: p.email,
          phone: p.phone,
          passwordHash,
          role: ROLES.DELIVERY_PARTNER,
          isEmailVerified: true,
          avatar: p.avatar,
          isDemoSeed: true,
        });
      } else if (!user.isDemoSeed) {
        user.isDemoSeed = true;
        await user.save();
      }

      let partner = await DeliveryPartner.findOne({ user: user._id });
      if (!partner) {
        partner = await DeliveryPartner.create({
          user: user._id,
          vehicleType: p.vehicleType,
          vehicleNumber: p.vehicleNumber,
          licenseNumber: p.licenseNumber,
          assignedCity: city._id,
          area: p.area,
          status: VENDOR_STATUS.APPROVED,
          averageRating: p.rating,
          profilePhoto: p.avatar,
          isAvailable: p.isAvailable,
          isOnline: p.isOnline,
          totalDistanceCovered: p.totalDistanceCovered,
          currentLocation: jitterLatLng(city),
        });
        created++;
      } else if (!partner.area) {
        partner.area = p.area;
        partner.totalDistanceCovered = partner.totalDistanceCovered || p.totalDistanceCovered;
        await partner.save();
      }
      partners.push(partner);
    }
    byCity[cityName] = partners;
  }

  logger.success(`Seeded ${created} new delivery partners across ${cityNames.length} cities (>=${DELIVERY_PARTNERS_PER_CITY}/city).`);
  return byCity;
}

// One real, login-able "headline" Delivery Partner account per non-Hyderabad city (Hyderabad's
// headline account is the original DEMO_ACCOUNTS.deliveryPartner, seeded separately in
// seedDemoAccounts — untouched by this function). Each of these is positioned FIRST in its
// city's delivery-partner array before seedCityOrders runs, so it — not an anonymous generated
// partner — is the one that picks up that city's richest slice of demo orders (see seed()'s
// per-city loop below), giving every city a genuinely populated Dashboard/Requests/Assigned/
// History/Earnings/Analytics on first login, not just Hyderabad.
async function seedHeadlineDeliveryPartners(citiesByName) {
  const created = {};
  for (const [cityName, account] of Object.entries(DELIVERY_PARTNERS_BY_CITY)) {
    if (cityName === 'Hyderabad') continue; // already handled by seedDemoAccounts
    const city = citiesByName[cityName];
    if (!city) continue;

    const passwordHash = await bcrypt.hash(account.password, 12);
    let user = await User.findOne({ email: account.email });
    if (!user) {
      const baseFields = {
        name: account.name,
        email: account.email,
        passwordHash,
        role: ROLES.DELIVERY_PARTNER,
        isEmailVerified: true,
        avatar: avatarUrl(account.name),
        isDemoSeed: true,
        selectedCity: city._id,
      };
      try {
        user = await User.create({ ...baseFields, phone: account.phone });
      } catch (err) {
        // account.phone can collide with one of the bulk-generated filler delivery partners
        // (demoScaleData.js's random phone pool isn't guaranteed disjoint from the hand-picked
        // headline numbers) — phone is unique+sparse but not otherwise meaningful here (never
        // shown on the demo login card, never used to sign in), so this headline account is far
        // more important to actually exist than to hold that exact digit string. Retrying
        // without it rather than letting account creation silently fail was the real bug: this
        // headline account could go permanently missing from a deployment where the collision
        // happened to land, with no visible error anywhere.
        if (err?.code === 11000 && err?.keyPattern?.phone) {
          user = await User.create(baseFields);
        } else {
          throw err;
        }
      }
      logger.success(`Seeded headline demo delivery partner account (${cityName}): ${account.email}`);
    } else {
      // Self-heal: backfill isDemoSeed/selectedCity on an already-existing account. Without a
      // correct selectedCity, the header CitySelector (which the frontend seeds from
      // user.selectedCity on login) would show a stale/wrong city for this account even though
      // its real DeliveryPartner.assignedCity is correct — see delivery/layout.js's city switcher.
      let changed = false;
      if (!user.isDemoSeed) { user.isDemoSeed = true; changed = true; }
      if (String(user.selectedCity || '') !== String(city._id)) { user.selectedCity = city._id; changed = true; }
      if (changed) await user.save();
    }

    let partner = await DeliveryPartner.findOne({ user: user._id });
    if (!partner) {
      partner = await DeliveryPartner.create({
        user: user._id,
        vehicleType: account.vehicleType,
        vehicleNumber: account.vehicleNumber,
        licenseNumber: account.licenseNumber,
        assignedCity: city._id,
        area: (AREA_BY_CITY[cityName] || [])[0] || '',
        status: VENDOR_STATUS.APPROVED,
        profilePhoto: avatarUrl(account.name),
        currentLocation: jitterLatLng(city),
      });
    }
    created[cityName] = { user, partner: await DeliveryPartner.findById(partner._id) };
  }
  return created;
}

// Realistic Notification Center content for every headline Delivery Partner (Hyderabad's
// original account included — it never had seeded notifications before this, a real gap since
// every other seeded "headline" account has a populated notification feed on first login).
// Real Notification documents, read via the actual /notifications API — same pattern as
// seedVendorNotifications below.
async function seedDeliveryPartnerNotifications(partnerUserId, cityName) {
  await Notification.deleteMany({ user: partnerUserId });

  const templates = [
    { type: 'delivery', title: 'New delivery request nearby', verb: `A new delivery request is open in ${cityName}.` },
    { type: 'delivery', title: 'Delivery confirmed', verb: 'You accepted a delivery request — pickup details are ready.' },
    { type: 'payment', title: 'Earnings credited', verb: 'Your delivery earnings for a recent order have been credited.' },
    { type: 'system', title: 'Rating received', verb: 'A customer rated your last delivery.' },
    { type: 'delivery', title: 'Pickup reminder', verb: 'You have a scheduled pickup coming up today.' },
    { type: 'delivery', title: 'Delivery completed', verb: 'Great work — another delivery marked complete.' },
    { type: 'system', title: `Welcome to RentEase, ${cityName}`, verb: `You're now an active delivery partner in ${cityName}.` },
  ];

  const docs = templates.map((tpl, i) => {
    const daysAgo = i * 2;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    return {
      user: partnerUserId,
      title: tpl.title,
      message: tpl.verb,
      type: tpl.type,
      channels: ['in_app'],
      isRead: i > 3,
      meta: { city: cityName },
      createdAt,
    };
  });

  await Notification.insertMany(docs);
  return docs.length;
}

// Realistic notifications for the demo vendor's Notification Center — real Notification
// documents (not mock/localStorage), read via the real /notifications API. The "trigger"
// (an actual order being placed) doesn't exist yet, so these are seeded directly rather than
// generated by a live event, but the storage/read/mark-read path is fully real.
async function seedVendorNotifications(vendorUserId, customerName, sampleProducts) {
  await Notification.deleteMany({ user: vendorUserId });
  if (sampleProducts.length === 0) return;

  const templates = [
    { type: 'order', status: 'Placed', title: 'New rental order', verb: 'placed a new order for' },
    { type: 'order', status: 'Confirmed', title: 'Order confirmed', verb: 'order confirmed for' },
    { type: 'maintenance', status: 'Requested', title: 'Maintenance requested', verb: 'requested maintenance for' },
    { type: 'order', status: 'Cancelled', title: 'Order cancelled', verb: 'cancelled their order for' },
    { type: 'order', status: 'Extension Requested', title: 'Extension requested', verb: 'requested a rental extension for' },
    { type: 'system', status: 'Review Submitted', title: 'New review', verb: 'left a review for' },
    { type: 'order', status: 'Delivered', title: 'Order delivered', verb: 'confirmed delivery of' },
    { type: 'payment', status: 'Paid', title: 'Payment received', verb: 'completed payment for' },
  ];

  const docs = templates.map((tpl, i) => {
    const product = sampleProducts[i % sampleProducts.length];
    const orderNumber = `ORD-2026-${(4000 + i * 37).toString()}`;
    const daysAgo = i * 2;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    return {
      user: vendorUserId,
      title: tpl.title,
      message: `${customerName} ${tpl.verb} ${product.name}.`,
      type: tpl.type,
      channels: ['in_app'],
      isRead: i > 4,
      relatedEntity: { type: 'product', id: product._id },
      meta: { customerName, productName: product.name, orderNumber, status: tpl.status },
      createdAt,
    };
  });

  await Notification.insertMany(docs);
  logger.success(`Seeded ${docs.length} demo vendor notifications.`);
}

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const generateOrderNumber = (i) => `RESEED${Date.now().toString(36).toUpperCase()}${i}`;

// buildCityOrderScenarios/seedDemoOrders both reuse the exact same positional scenario template
// for every city — only the underlying products/customers/partners plugged in differ. Without
// this, any review/timing value derived purely from a scenario's array index `i` (star rating
// picked via DELIVERY_REVIEWS[i % length], pickup/delivery duration jitter) lands on the exact
// same value for every city whose headline partner happens to sit at the same scenario
// positions — which is why Bengaluru/Chennai/Mumbai's averageRating and avgDeliveryMinutes came
// out byte-identical to each other even though their orders were genuinely separate documents.
// A small deterministic per-city offset applied only to review/timing selection (never to the
// product/customer/scenario array indices themselves, which must stay aligned with `i`) breaks
// that coincidental alignment.
function citySalt(seedStr = '') {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) % 97;
  return h;
}

// Real Order/OrderItem/Payment documents (not demo/mock data) spanning every stage of the
// checkout -> vendor-confirm -> delivery-partner-accept -> pickup -> deliver lifecycle, so
// Vendor Orders, Delivery Requests/Assigned/History, Customer Rentals, and the Vendor's
// Delivery Partner Management screen all show genuine, interconnected activity the first time
// anyone logs into this seed. Mirrors the exact status/field transitions order.controller.js
// and delivery.controller.js perform at runtime. Product/Order/OrderItem/Payment cleanup for
// a fresh reseed happens once in seedProducts (this function only creates).
async function seedDemoOrders({ customerPool, demoVendor, deliveryPartners, products, rentalPlans, cityName = 'Hyderabad', cityState = 'Telangana' }) {
  // Reset before re-incrementing below — otherwise re-running the seed script would keep
  // compounding these counters instead of reflecting only this run's seeded deliveries.
  await DeliveryPartner.updateMany(
    { _id: { $in: deliveryPartners.map((p) => p._id) } },
    { $set: { totalDeliveries: 0, totalEarnings: 0 } }
  );

  const vendorProducts = products.filter(
    (p) => p.vendor && String(p.vendor) === String(demoVendor._id) && String(p.city) === String(deliveryPartners[0].assignedCity)
  );
  if (vendorProducts.length < 8) return; // not enough same-city vendor stock to build a realistic spread

  // Real per-customer addresses (falling back to a generic same-city address) so orders seeded
  // for non-Hyderabad cities don't all show a hardcoded Hyderabad delivery address.
  const addresses = await Address.find({ user: { $in: customerPool.map((c) => c._id) } }).select('user addressLine1 addressLine2 pincode');
  const addressByCustomer = Object.fromEntries(addresses.map((a) => [String(a.user), a]));

  const planByDuration = Object.fromEntries(rentalPlans.map((p) => [p.durationMonths, p]));
  const primaryPartner = deliveryPartners[0]; // the one login-able demo delivery partner

  // Two live-interactive items (assigned to the primary/login-able partner so there's
  // something in their own Assigned Deliveries right away), plus 2 pending / 2 open-request,
  // plus a big block of completed deliveries. The primary partner (the only one anyone can
  // actually log in as) gets the bulk of them — 12, each with a different customer — so their
  // own Messages/History pages show genuine variety across the full customer pool instead of
  // 2-3 repeated names; the other 4 partners get a couple each so Vendor Delivery Partner
  // Management analytics still has real multi-partner data to compare.
  const secondaryPartners = deliveryPartners.slice(1);
  const SCENARIOS = [
    { status: ORDER_ITEM_STATUS.PENDING, daysAgo: 0 },
    { status: ORDER_ITEM_STATUS.PENDING, daysAgo: 1 },
    { status: ORDER_ITEM_STATUS.CONFIRMED, daysAgo: 2 },
    { status: ORDER_ITEM_STATUS.CONFIRMED, daysAgo: 3 },
    { status: ORDER_ITEM_STATUS.PREPARING, partner: primaryPartner, daysAgo: 4 },
    { status: ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, partner: primaryPartner, daysAgo: 5 },
    ...Array.from({ length: 12 }).map((_, i) => ({
      status: ORDER_ITEM_STATUS.ACTIVE_RENTAL,
      partner: primaryPartner,
      daysAgo: 8 + i * 3,
    })),
    ...Array.from({ length: 8 }).map((_, i) => ({
      status: ORDER_ITEM_STATUS.ACTIVE_RENTAL,
      partner: secondaryPartners[i % secondaryPartners.length],
      daysAgo: 10 + i * 4,
    })),
  ];

  // Two independently-derived salts (not the same value reused) so pickup-time and
  // delivery-time jitter don't stay correlated across cities — two cities landing on nearby
  // `citySalt(cityName)` values would otherwise still average out to coincidentally-identical
  // avgDeliveryMinutes even though their review picks differed.
  const salt = citySalt(cityName);
  const salt2 = citySalt(`${cityName}#delivery`);
  let seeded = 0;
  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const product = vendorProducts[i % vendorProducts.length];
    const plan = planByDuration[1] || rentalPlans[0];
    const customer = customerPool[i % customerPool.length];
    // Only the already-delivered-ish scenarios (daysAgo >= 7 — everything past the fresh
    // pending/confirmed/preparing stage) get an extra per-city day offset. Without this, every
    // city's monthly delivery trend (bucketed by deliveredAt's month) landed in the exact same
    // months, since `daysAgo` itself is a fixed template shared by every city — the review/hour
    // salting above never touched which DAY (hence which month) a delivery fell on. Leaving
    // fresh (<7 day) scenarios unshifted keeps "just placed" orders looking genuinely recent.
    const dayOffset = scenario.daysAgo >= 7 ? salt % 15 : 0;
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - scenario.daysAgo - dayOffset);

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const gstAmount = Math.round(monthlyRentalPrice * 0.18);
    const grandTotalDue = monthlyRentalPrice + product.securityDeposit + product.deliveryCharge + gstAmount;
    const custAddr = addressByCustomer[String(customer._id)];

    const order = await Order.create({
      orderNumber: generateOrderNumber(i),
      customer: customer._id,
      city: product.city,
      deliveryAddress: {
        contactName: customer.name,
        contactPhone: customer.phone || '9000000001',
        addressLine1: custAddr?.addressLine1 || `Flat, ${cityName} Residency`,
        addressLine2: custAddr?.addressLine2 || cityName,
        city: cityName,
        state: cityState,
        pincode: custAddr?.pincode || '500032',
      },
      items: [],
      totalMonthlyRental: monthlyRentalPrice,
      totalSecurityDeposit: product.securityDeposit,
      totalDeliveryCharge: product.deliveryCharge,
      grandTotalDue,
      status: scenario.status === ORDER_ITEM_STATUS.PENDING ? ORDER_STATUS.PENDING : ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentMethod: ['upi', 'credit_card', 'net_banking', 'cod'][i % 4],
      placedAt,
      createdAt: placedAt,
    });

    const plainOtp = String(1000 + Math.floor(Math.random() * 9000));
    const statusHistory = [{ status: ORDER_ITEM_STATUS.PENDING, changedAt: placedAt, note: 'Order placed and paid.' }];
    if (scenario.status !== ORDER_ITEM_STATUS.PENDING) {
      statusHistory.push({ status: ORDER_ITEM_STATUS.CONFIRMED, changedAt: placedAt, note: 'Confirmed by vendor.' });
    }
    if (scenario.partner) {
      statusHistory.push({ status: ORDER_ITEM_STATUS.PREPARING, changedAt: placedAt, note: 'Accepted by delivery partner.' });
    }

    const deliveryFee = scenario.partner ? 60 + Math.round(product.deliveryCharge * 0.5) : 0;
    const review = scenario.status === ORDER_ITEM_STATUS.ACTIVE_RENTAL ? DELIVERY_REVIEWS[(i + salt) % DELIVERY_REVIEWS.length] : null;

    const itemFields = {
      order: order._id,
      vendor: demoVendor._id,
      product: product._id,
      rentalPlan: plan._id,
      quantity: 1,
      monthlyRentalPrice,
      securityDeposit: product.securityDeposit,
      deliveryCharge: product.deliveryCharge,
      discountPercent: plan.discountPercent || 0,
      installationRequired: product.installationRequired,
      deliveryOtpHash: hashCode(plainOtp),
      status: scenario.status,
      statusHistory,
      deliveryPartner: scenario.partner ? scenario.partner._id : null,
      deliveryFee,
    };

    // Deterministic per-order jitter (not a fixed 2h/26h for every single order) so each
    // delivery partner's average pickup-to-drop-off time is a genuine, varying number instead of
    // landing on the exact same 1440 minutes for literally every account in every city.
    const pickupHours = 1 + ((i + salt) % 5); // 1-5h
    const deliveryHours = 20 + (((i + salt2) * 3) % 18); // 20-37h after pickup window opens
    if (scenario.status === ORDER_ITEM_STATUS.OUT_FOR_DELIVERY || scenario.status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) {
      itemFields.pickedUpAt = new Date(placedAt.getTime() + pickupHours * 60 * 60 * 1000);
    }
    if (scenario.status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) {
      const deliveredAt = new Date(placedAt.getTime() + deliveryHours * 60 * 60 * 1000);
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

    if (scenario.partner && scenario.status === ORDER_ITEM_STATUS.ACTIVE_RENTAL) {
      await DeliveryPartner.findByIdAndUpdate(scenario.partner._id, {
        $inc: { totalDeliveries: 1, totalEarnings: deliveryFee },
      });
    }

    seeded++;
  }

  logger.success(`Seeded ${seeded} demo orders spanning pending -> confirmed -> assigned -> delivered, across ${deliveryPartners.length} delivery partners and ${customerPool.length} customers (${cityName}).`);
}

// Builds a fixed, realistic scenario list spanning the FULL OrderItem status range (including
// cancelled/returned/completed/extension-requested/pickup-scheduled, which seedDemoOrders above
// never generates) so every status bucket the Admin Orders/Rentals portals filter by has real
// content in every city, not just Hyderabad.
function buildCityOrderScenarios(deliveryPartners) {
  const p = (i) => (deliveryPartners.length ? deliveryPartners[i % deliveryPartners.length] : null);
  return [
    { status: ORDER_ITEM_STATUS.PENDING, daysAgo: 0 },
    { status: ORDER_ITEM_STATUS.PENDING, daysAgo: 1 },
    { status: ORDER_ITEM_STATUS.CONFIRMED, daysAgo: 2 },
    { status: ORDER_ITEM_STATUS.CONFIRMED, daysAgo: 2 },
    { status: ORDER_ITEM_STATUS.PREPARING, partner: p(0), daysAgo: 3 },
    { status: ORDER_ITEM_STATUS.PREPARING, partner: p(1), daysAgo: 3 },
    { status: ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, partner: p(2), daysAgo: 4 },
    { status: ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, partner: p(3), daysAgo: 4 },
    // Active rentals — "current" (far from due)
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(0), daysAgo: 15, rentalMonths: 3 },
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(1), daysAgo: 20, rentalMonths: 6 },
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(2), daysAgo: 10, rentalMonths: 1 },
    // Active rentals — "upcoming returns" (end within the next few days)
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(3), daysAgo: 28, forceEndInDays: 3 },
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(0), daysAgo: 25, forceEndInDays: 6 },
    // Active rentals — "overdue" (end already passed, still not returned)
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(1), daysAgo: 40, forceEndInDays: -5 },
    { status: ORDER_ITEM_STATUS.ACTIVE_RENTAL, partner: p(2), daysAgo: 50, forceEndInDays: -10 },
    // Extension requested / pickup scheduled (both follow an active rental)
    { status: ORDER_ITEM_STATUS.EXTENSION_REQUESTED, partner: p(3), daysAgo: 35 },
    { status: ORDER_ITEM_STATUS.PICKUP_SCHEDULED, partner: p(0), daysAgo: 45 },
    // Returned / Completed
    { status: ORDER_ITEM_STATUS.RETURNED, partner: p(1), daysAgo: 60 },
    { status: ORDER_ITEM_STATUS.RETURNED, partner: p(2), daysAgo: 65 },
    { status: ORDER_ITEM_STATUS.COMPLETED, partner: p(3), daysAgo: 70 },
    { status: ORDER_ITEM_STATUS.COMPLETED, partner: p(0), daysAgo: 75 },
    { status: ORDER_ITEM_STATUS.COMPLETED, partner: p(1), daysAgo: 80 },
    // Cancelled
    { status: ORDER_ITEM_STATUS.CANCELLED, daysAgo: 5 },
    { status: ORDER_ITEM_STATUS.CANCELLED, daysAgo: 8 },
    { status: ORDER_ITEM_STATUS.CANCELLED, partner: p(2), daysAgo: 12 },
  ];
}

// Generalizes seedDemoOrders across every city (that function stays Hyderabad+demo-vendor-
// specific, tuned for the login-able demo accounts' own dashboards) — real Order/OrderItem/
// Payment documents covering the FULL status range, so the Admin Orders/Rentals portals have
// genuine content — current/upcoming-return/overdue/completed/cancelled rentals, and every
// pipeline stage of Orders — in every city, not just the one the demo accounts operate in.
async function seedCityOrders({ city, cityName, products, deliveryPartners, customers, rentalPlans }) {
  if (products.length < 8 || !customers.length || !rentalPlans.length) return 0;

  const addresses = await Address.find({ user: { $in: customers.map((c) => c._id) } }).select('user addressLine1 addressLine2 pincode');
  const addressByCustomer = Object.fromEntries(addresses.map((a) => [String(a.user), a]));

  const planByDuration = Object.fromEntries(rentalPlans.map((p) => [p.durationMonths, p]));
  const scenarios = buildCityOrderScenarios(deliveryPartners);
  const salt = citySalt(cityName);
  const salt2 = citySalt(`${cityName}#delivery`);
  let seeded = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const product = products[i % products.length];
    const plan = planByDuration[scenario.rentalMonths] || planByDuration[1] || rentalPlans[0];
    const customer = customers[i % customers.length];
    const custAddr = addressByCustomer[String(customer._id)];
    // See the matching comment in seedDemoOrders above — a per-city day offset on the
    // already-delivered-ish scenarios so monthly trend buckets actually diverge across cities.
    const dayOffset = scenario.daysAgo >= 7 ? salt % 15 : 0;
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - scenario.daysAgo - dayOffset);

    const monthlyRentalPrice = Math.round(product.monthlyRentalPrice * (1 - (plan.discountPercent || 0) / 100));
    const gstAmount = Math.round(monthlyRentalPrice * 0.18);
    const grandTotalDue = monthlyRentalPrice + product.securityDeposit + product.deliveryCharge + gstAmount;
    const isCancelled = scenario.status === ORDER_ITEM_STATUS.CANCELLED;

    const order = await Order.create({
      orderNumber: generateOrderNumber(`${cityName.slice(0, 2).toUpperCase()}${i}${Date.now().toString(36).slice(-3)}`),
      customer: customer._id,
      city: city._id,
      deliveryAddress: {
        contactName: customer.name,
        contactPhone: customer.phone || '9000000001',
        addressLine1: custAddr?.addressLine1 || `Flat, ${cityName} Residency`,
        addressLine2: custAddr?.addressLine2 || cityName,
        city: cityName,
        state: city.state,
        pincode: custAddr?.pincode || '000000',
      },
      items: [],
      totalMonthlyRental: monthlyRentalPrice,
      totalSecurityDeposit: product.securityDeposit,
      totalDeliveryCharge: product.deliveryCharge,
      grandTotalDue,
      status: isCancelled
        ? ORDER_STATUS.CANCELLED
        : scenario.status === ORDER_ITEM_STATUS.PENDING
        ? ORDER_STATUS.PENDING
        : [ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED].includes(scenario.status)
        ? ORDER_STATUS.COMPLETED
        : ORDER_STATUS.CONFIRMED,
      paymentStatus: isCancelled ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PAID,
      paymentMethod: ['upi', 'credit_card', 'net_banking', 'cod', 'debit_card'][i % 5],
      placedAt,
      createdAt: placedAt,
    });

    const plainOtp = String(1000 + Math.floor(Math.random() * 9000));
    const statusHistory = [{ status: ORDER_ITEM_STATUS.PENDING, changedAt: placedAt, note: 'Order placed and paid.' }];
    if (!isCancelled && scenario.status !== ORDER_ITEM_STATUS.PENDING) {
      statusHistory.push({ status: ORDER_ITEM_STATUS.CONFIRMED, changedAt: placedAt, note: 'Confirmed by vendor.' });
    }
    if (isCancelled) {
      statusHistory.push({ status: ORDER_ITEM_STATUS.CANCELLED, changedAt: placedAt, note: 'Cancelled by customer.' });
    }

    const isPostDelivery = [
      ORDER_ITEM_STATUS.OUT_FOR_DELIVERY, ORDER_ITEM_STATUS.ACTIVE_RENTAL, ORDER_ITEM_STATUS.EXTENSION_REQUESTED,
      ORDER_ITEM_STATUS.PICKUP_SCHEDULED, ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED,
    ].includes(scenario.status);
    const isRentalActive = [
      ORDER_ITEM_STATUS.ACTIVE_RENTAL, ORDER_ITEM_STATUS.EXTENSION_REQUESTED, ORDER_ITEM_STATUS.PICKUP_SCHEDULED,
      ORDER_ITEM_STATUS.RETURNED, ORDER_ITEM_STATUS.COMPLETED,
    ].includes(scenario.status);
    const deliveryFee = scenario.partner ? 60 + Math.round(product.deliveryCharge * 0.5) : 0;
    const review = isPostDelivery && scenario.partner ? DELIVERY_REVIEWS[(i + salt) % DELIVERY_REVIEWS.length] : null;

    const itemFields = {
      order: order._id,
      vendor: product.vendor || null,
      product: product._id,
      rentalPlan: plan._id,
      quantity: 1,
      monthlyRentalPrice,
      securityDeposit: product.securityDeposit,
      deliveryCharge: product.deliveryCharge,
      discountPercent: plan.discountPercent || 0,
      installationRequired: product.installationRequired,
      deliveryOtpHash: hashCode(plainOtp),
      status: scenario.status,
      statusHistory,
      deliveryPartner: scenario.partner ? scenario.partner._id : null,
      deliveryFee,
      cancelReason: isCancelled ? 'Customer changed their mind before delivery.' : '',
    };

    // Deterministic per-order jitter — see the matching comment in seedDemoOrders above for why
    // a fixed 2h/26h offset for every order was making every partner's avg delivery time (and
    // therefore performanceScore) identical across every city.
    const pickupHours = 1 + ((i + salt) % 5); // 1-5h
    const deliveryHours = 20 + (((i + salt2) * 3) % 18); // 20-37h after pickup window opens
    if (isPostDelivery) {
      itemFields.pickedUpAt = new Date(placedAt.getTime() + pickupHours * 60 * 60 * 1000);
    }
    if (isRentalActive) {
      const deliveredAt = new Date(placedAt.getTime() + deliveryHours * 60 * 60 * 1000);
      itemFields.deliveredAt = deliveredAt;
      itemFields.rentalStartDate = deliveredAt;

      let end;
      if (typeof scenario.forceEndInDays === 'number') {
        end = new Date();
        end.setDate(end.getDate() + scenario.forceEndInDays);
      } else {
        end = new Date(deliveredAt);
        end.setMonth(end.getMonth() + plan.durationMonths);
      }
      itemFields.rentalEndDate = end;

      if (review) {
        itemFields.deliveryRating = review.rating;
        itemFields.deliveryReviewComment = review.comment;
        itemFields.deliveryReviewDate = deliveredAt;
      }
    }

    const orderItem = await OrderItem.create(itemFields);
    order.items = [orderItem._id];
    await order.save();

    await Payment.create({
      order: order._id,
      user: customer._id,
      amount: grandTotalDue,
      method: order.paymentMethod,
      status: isCancelled ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PAID,
      type: 'rental',
      createdAt: placedAt,
    });

    if (scenario.partner && isPostDelivery && !isCancelled) {
      await DeliveryPartner.findByIdAndUpdate(scenario.partner._id, {
        $inc: { totalDeliveries: 1, totalEarnings: deliveryFee, totalDistanceCovered: 3 + Math.round(Math.random() * 15) },
      });
    }

    seeded++;
  }

  return seeded;
}

async function seedRentalPlans(superAdmin) {
  for (const plan of RENTAL_PLANS) {
    await RentalPlan.findOneAndUpdate(
      { durationMonths: plan.durationMonths },
      { ...plan, createdBy: superAdmin._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.success(`Seeded ${RENTAL_PLANS.length} rental plans.`);
}

async function generateInventoryAssets(sku) {
  const serialNumber = `SN-${sku}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const [qrCodeUrl, barcodeBuffer] = await Promise.all([
    qrcode.toDataURL(serialNumber),
    bwipjs.toBuffer({ bcid: 'code128', text: sku, scale: 2, height: 10, includetext: true, textxalign: 'center' }),
  ]);

  return { serialNumber, qrCodeUrl, barcodeUrl: `data:image/png;base64,${barcodeBuffer.toString('base64')}` };
}

async function seedProducts(demoVendor, extraVendors = [], cityVendorsByCity = {}) {
  // Products are pure seed/demo data (no admin/vendor product-creation UI exists yet), so a
  // reseed always regenerates the full catalog rather than skipping when data already exists.
  // Orders/OrderItems/Payments reference product ids that won't survive this wipe either, so
  // they're cleared here too rather than leaving them to dangle on stale references.
  await Product.deleteMany({});
  await InventoryItem.deleteMany({});
  await Order.deleteMany({});
  await OrderItem.deleteMany({});
  await Payment.deleteMany({});

  const [furnitureCategory, applianceCategory, cities] = await Promise.all([
    Category.findOne({ slug: 'furniture' }),
    Category.findOne({ slug: 'appliances' }),
    City.find({}),
  ]);

  const cityIdsByName = Object.fromEntries(cities.map((c) => [c.name, c._id]));

  // Per-city vendor pool that non-RentEase-owned products round-robin across — the demo vendor
  // is weighted 4x within Hyderabad's own pool (its home city) so that dashboard/catalog stays
  // the richest, while every other city gets real distribution across its own >=10 generated
  // vendors (plus the 3 Hyderabad-only EXTRA_VENDORS). This is what gives every vendor a
  // genuine, non-zero Products Count/Revenue instead of one vendor owning almost the whole
  // catalog.
  //
  // The demo vendor is ALSO given a real (smaller, 2x-weighted) slice of every other city's
  // catalog — not just Hyderabad's — specifically so the login-able Demo Vendor account has
  // genuine, different, non-empty products/orders/analytics in every city, not just its home
  // one. Without this, switching the Vendor Analytics page's city filter to anywhere but
  // Hyderabad showed real zeros (technically correct — a vendor with zero products in a city
  // has zero analytics there — but not what "every city needs its own realistic data" asks for
  // on the one account reviewers actually log into).
  const vendorPoolByCity = {};
  for (const cityName of Object.keys(cityIdsByName)) vendorPoolByCity[cityName] = [];
  vendorPoolByCity.Hyderabad.push(demoVendor._id, demoVendor._id, demoVendor._id, demoVendor._id);
  extraVendors.forEach((v) => vendorPoolByCity.Hyderabad.push(v._id));
  for (const [cityName, vendors] of Object.entries(cityVendorsByCity)) {
    vendorPoolByCity[cityName] = [...(vendorPoolByCity[cityName] || []), ...vendors.map((v) => v._id)];
    if (cityName !== 'Hyderabad') vendorPoolByCity[cityName].push(demoVendor._id, demoVendor._id);
  }

  const products = generateDemoProducts({
    furnitureCategoryId: furnitureCategory._id,
    applianceCategoryId: applianceCategory._id,
    cityIdsByName,
    vendorPoolByCity,
  });

  const inserted = await Product.insertMany(products);
  logger.success(`Seeded ${inserted.length} demo products across ${cities.length} cities.`);

  // One serialized physical unit per product — real QR/barcode images, not placeholders —
  // giving every product a genuine serial number, QR code and barcode (InventoryItem is the
  // architectural home for these per-unit fields; Product stays a pure catalog listing).
  // Generated in parallel batches rather than one-at-a-time: at ~1000 products, a sequential
  // await-in-a-loop here was the single biggest contributor to the seed script blowing past
  // Vercel's serverless function timeout in production.
  const BATCH_SIZE = 50;
  const inventoryItems = [];
  for (let i = 0; i < inserted.length; i += BATCH_SIZE) {
    const batch = inserted.slice(i, i + BATCH_SIZE);
    const batchAssets = await Promise.all(batch.map((product) => generateInventoryAssets(product.sku)));
    batch.forEach((product, idx) => {
      const assets = batchAssets[idx];
      inventoryItems.push({
        product: product._id,
        serialNumber: assets.serialNumber,
        qrCodeUrl: assets.qrCodeUrl,
        barcodeUrl: assets.barcodeUrl,
        status: INVENTORY_STATUS.AVAILABLE,
        city: product.city,
        purchaseDate: new Date(),
      });
    });
  }
  await InventoryItem.insertMany(inventoryItems);
  logger.success(`Seeded ${inventoryItems.length} inventory units with real QR codes + barcodes.`);

  return inserted;
}

async function seed() {
  await connectDB();

  for (const city of SUPPORTED_CITIES) {
    await City.findOneAndUpdate({ name: city.name }, city, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  logger.success(`Seeded ${SUPPORTED_CITIES.length} cities.`);
  const cities = await City.find({});
  const citiesByName = Object.fromEntries(cities.map((c) => [c.name, c]));

  for (const category of CATEGORIES) {
    await Category.findOneAndUpdate({ slug: category.slug }, category, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  logger.success(`Seeded ${CATEGORIES.length} categories.`);

  await migrateLegacySuperAdmins();
  const superAdmin = await seedDemoAdmin();

  await seedRentalPlans(superAdmin);

  if (env.demoMode) {
    const { demoVendor, vendorUser } = await seedDemoAccounts(superAdmin, citiesByName);
    const extraCustomers = await seedExtraCustomers();
    const extraPartners = await seedExtraDeliveryPartners(citiesByName);
    const extraVendors = await seedExtraVendors(citiesByName, superAdmin);

    // City-scale minimums for the Admin Customers/Vendors/Delivery-Partners portals — layered
    // on top of the hand-authored pools above.
    const cityCustomers = await seedCityCustomers(citiesByName);
    const cityVendors = await seedCityVendors(citiesByName, superAdmin);
    const cityDeliveryPartners = await seedCityDeliveryPartnersScale(citiesByName);
    // One real, login-able "headline" account per non-Hyderabad city — see the function's own
    // comment for why these get positioned first in seedCityOrders below.
    const headlinePartners = await seedHeadlineDeliveryPartners(citiesByName);

    const insertedProducts = await seedProducts(demoVendor, extraVendors, cityVendors);
    await seedVendorNotifications(vendorUser._id, DEMO_ACCOUNTS.customer.name, insertedProducts.slice(0, 8));

    const [customerUser, deliveryUser, rentalPlans] = await Promise.all([
      User.findOne({ email: DEMO_ACCOUNTS.customer.email }),
      User.findOne({ email: DEMO_ACCOUNTS.deliveryPartner.email }),
      RentalPlan.find({}),
    ]);
    const primaryDeliveryPartner = deliveryUser ? await DeliveryPartner.findOne({ user: deliveryUser._id }) : null;
    const deliveryPartners = [primaryDeliveryPartner, ...extraPartners.map((p) => p.partner)].filter(Boolean);
    const customerPool = [customerUser, ...extraCustomers].filter(Boolean);

    if (customerPool.length && deliveryPartners.length && rentalPlans.length) {
      await seedDemoOrders({ customerPool, demoVendor, deliveryPartners, products: insertedProducts, rentalPlans });
    }

    // Same real Order/OrderItem/Payment richness for the demo vendor's own products in every
    // other city too — tied to that city's headline (login-able) delivery partner — so the
    // Vendor Analytics "Delivery Partner Analytics" section (which aggregates real OrderItems
    // with vendor: demoVendor._id) and the headline delivery partner's own Dashboard/Earnings/
    // History have genuine, non-sparse data in Bengaluru/Chennai/Mumbai, not just Hyderabad.
    if (rentalPlans.length) {
      for (const cityName of Object.keys(citiesByName)) {
        if (cityName === 'Hyderabad') continue; // already seeded above via the primary demo delivery partner
        const hp = headlinePartners[cityName];
        const cityCustomerPoolForDemoVendor = cityCustomers[cityName] || [];
        if (!hp || !cityCustomerPoolForDemoVendor.length) continue;
        const cityPartnersForDemoVendor = [hp.partner, ...(cityDeliveryPartners[cityName] || [])].filter(Boolean);
        await seedDemoOrders({
          customerPool: cityCustomerPoolForDemoVendor,
          demoVendor,
          deliveryPartners: cityPartnersForDemoVendor,
          products: insertedProducts,
          rentalPlans,
          cityName,
          cityState: citiesByName[cityName].state,
        });
      }
    }

    // Real DeliveryPartner.averageRating, computed from the actual OrderItem.deliveryRating
    // values assigned above (DELIVERY_REVIEWS ratings genuinely vary 3-5 star) — every partner's
    // rating now reflects their own real delivered-order history instead of a stored field that
    // was never backfilled. Before this, every login-able headline delivery partner account
    // (the only ones anyone actually signs into) showed a flat 0 rating everywhere — on their
    // own Analytics/Dashboard, and on Vendor's/Admin's fleet views of the same partner — which
    // both looked broken AND made every city's "Customer rating"/"Delivery performance" KPI
    // identical (0) instead of genuinely different. Runs over every seeded order in one pass, so
    // it corrects headline accounts, the original Hyderabad account, and the scale-generated
    // partner pool alike, replacing whatever fake/absent value each had before.
    //
    // Deliberately positioned BEFORE seedCityOrders below: this and the notifications block are
    // cheap (a handful of ops) while seedCityOrders is the single most expensive remaining step
    // (hundreds of sequential per-order writes across 4 cities) and the one most likely to run
    // this serverless invocation past its time budget — so anything that must not be skipped by
    // that goes first. Only misses seedCityOrders' own rating contributions when it does complete
    // in time, which is an acceptable trade for guaranteeing this always runs at all.
    const ratingAgg = await OrderItem.aggregate([
      { $match: { deliveryPartner: { $ne: null }, deliveryRating: { $ne: null } } },
      { $group: { _id: '$deliveryPartner', avg: { $avg: '$deliveryRating' } } },
    ]);
    if (ratingAgg.length) {
      await Promise.all(
        ratingAgg.map((r) => DeliveryPartner.updateOne({ _id: r._id }, { $set: { averageRating: Math.round(r.avg * 100) / 100 } }))
      );
      logger.success(`Computed real averageRating for ${ratingAgg.length} delivery partners from their actual delivery reviews.`);
    }

    // Notification Center content for every headline Delivery Partner — Hyderabad's original
    // account included, since it never had any seeded notifications before this.
    let notifiedPartners = 0;
    if (deliveryUser) {
      await seedDeliveryPartnerNotifications(deliveryUser._id, 'Hyderabad');
      notifiedPartners++;
    }
    for (const [cityName, hp] of Object.entries(headlinePartners)) {
      await seedDeliveryPartnerNotifications(hp.user._id, cityName);
      notifiedPartners++;
    }
    if (notifiedPartners) logger.success(`Seeded notifications for ${notifiedPartners} headline delivery partner accounts.`);

    // Real Orders/Rentals spanning the FULL status range in every city (not just Hyderabad),
    // using each city's own generated customers/vendor-products/delivery-partners — this is
    // what keeps the Admin Orders/Rentals portals from being empty outside Hyderabad. Positioned
    // last among the order-seeding steps (see comment above) since it's the most expensive.
    if (rentalPlans.length) {
      let totalCityOrders = 0;
      for (const cityName of Object.keys(citiesByName)) {
        const city = citiesByName[cityName];
        const cityProducts = insertedProducts.filter((p) => String(p.city) === String(city._id));
        // Headline account first (when one exists for this city) so it wins the early scenario
        // slots in buildCityOrderScenarios — Hyderabad has none here (it's handled separately by
        // seedDemoOrders above), so this is a no-op for Hyderabad.
        const cityPartners = [headlinePartners[cityName]?.partner, ...(cityDeliveryPartners[cityName] || [])].filter(Boolean);
        const cityCustomerPool = cityCustomers[cityName] || [];
        const seededHere = await seedCityOrders({
          city,
          cityName,
          products: cityProducts,
          deliveryPartners: cityPartners,
          customers: cityCustomerPool,
          rentalPlans,
        });
        totalCityOrders += seededHere;
      }
      logger.success(`Seeded ${totalCityOrders} additional orders/rentals spanning the full status range across ${Object.keys(citiesByName).length} cities.`);
    }

    // Pre-populate the open Delivery Requests pool immediately in every city that has delivery
    // partners (the same generator also tops this back up at runtime whenever a delivery
    // partner's queue runs low — see delivery.controller.js's listRequests), so the screen is
    // never empty on first login even before that runtime top-up has a chance to fire.
    for (const cityName of Object.keys(citiesByName)) {
      const city = citiesByName[cityName];
      const hasPartners = (cityDeliveryPartners[cityName] || []).length > 0 || (cityName === citiesByName.Hyderabad?.name && primaryDeliveryPartner);
      if (!hasPartners) continue;
      const openCount = await generateOpenDeliveryRequests({ cityId: city._id, count: cityName === 'Hyderabad' ? 9 : 6 });
      if (openCount > 0) logger.success(`Seeded ${openCount} open delivery requests in ${cityName}.`);
    }
  }

  logger.success('Seed complete.');
}

// Exported rather than self-invoking so this same seed logic can be triggered two ways:
// (1) as a one-off local/CI script via seedCli.js (`node src/seedCli.js`), which owns the
// process.exit lifecycle, and (2) from a live request handler (routes/admin.routes.js's
// protected POST /admin/seed) when a serverless deployment's database has never been seeded
// and there's no shell access to run a CLI script against it directly — calling process.exit()
// from inside a request handler would kill the whole function mid-response, so this module
// must never do that itself.
module.exports = seed;
// Also exported individually so a narrow one-off repair (e.g. system.routes.js's /fix-account)
// can re-run just this one idempotent step against a live production DB without invoking the
// full seed() — which wipes Product/Order/InventoryItem/Payment and would destroy real data.
module.exports.seedHeadlineDeliveryPartners = seedHeadlineDeliveryPartners;
// Exported for services/ensureDemoAccounts.js — the lightweight, startup-safe subset of this
// same idempotent logic (just cities + the 4 login-able demo accounts), so a brand-new,
// never-seeded database always has working demo logins without needing the full, heavy seed()
// pipeline (1000+ products) to have been run manually first.
module.exports.seedDemoAdmin = seedDemoAdmin;
module.exports.seedDemoAccounts = seedDemoAccounts;
