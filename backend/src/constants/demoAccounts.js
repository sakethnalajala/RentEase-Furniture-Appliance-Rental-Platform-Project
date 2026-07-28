// Publicly-known demo credentials shown on the Register/Login pages so reviewers can click
// straight into each role without registering — seeded by seed.js, only ever meaningful
// when env.demoMode is on. Keep in sync with frontend/lib/demoAccounts.js.
const DEMO_ACCOUNTS = {
  customer: {
    name: 'Demo Customer',
    email: 'demo.customer@rentease.com',
    password: 'Demo@1234',
    phone: '9000000001',
  },
  // Also seed.js's one bootstrap administrative account (attributed as approvedBy/createdBy
  // on seed-generated Vendor/RentalPlan records) — there is no separate Super Admin role or
  // seed account in this app.
  admin: {
    name: 'Demo Admin',
    email: 'admin@rentease.com',
    password: 'Admin@123',
  },
  vendor: {
    name: 'Demo Vendor',
    email: 'demo.vendor@rentease.com',
    password: 'Demo@1234',
    phone: '9000000002',
    businessName: 'Demo Vendor Co.',
  },
  // The original single login-able delivery partner — kept exactly as-is (still Hyderabad) so
  // every existing direct reference to `DEMO_ACCOUNTS.deliveryPartner.*` (seed.js's
  // seedDemoAccounts in particular) keeps working unchanged. `deliveryPartnersByCity` below is
  // the new, city-aware map the login page and resolveDemoAccountEmail actually use — Hyderabad
  // there is just an alias of this same account, not a second copy.
  deliveryPartner: {
    name: 'Demo Delivery Partner',
    email: 'demo.delivery@rentease.com',
    password: 'Demo@1234',
    phone: '9000000003',
    vehicleType: 'bike',
    vehicleNumber: 'TS09AB1234',
    licenseNumber: 'DLDEMO1234',
  },
};

// One real, login-able Delivery Partner demo account per city — each with its own genuinely
// different seeded Requests/Assigned/History/Notifications/Messages/Earnings/Analytics (see
// seed.js's seedHeadlineDeliveryPartners / seedDeliveryPartnerNotifications). Hyderabad is an
// alias of DEMO_ACCOUNTS.deliveryPartner above, not a duplicate account.
const DELIVERY_PARTNERS_BY_CITY = {
  Hyderabad: DEMO_ACCOUNTS.deliveryPartner,
  Bengaluru: {
    name: 'Karthik Reddy',
    email: 'demo.delivery.bengaluru@rentease.com',
    password: 'Demo@1234',
    phone: '9000000013',
    vehicleType: 'bike',
    vehicleNumber: 'KA05DP1234',
    licenseNumber: 'DLBLR0001',
  },
  Chennai: {
    name: 'Arun Kumar',
    email: 'demo.delivery.chennai@rentease.com',
    password: 'Demo@1234',
    phone: '9000000014',
    vehicleType: 'bike',
    vehicleNumber: 'TN09DP5678',
    licenseNumber: 'DLCHN0001',
  },
  Mumbai: {
    name: 'Rohan Deshmukh',
    email: 'demo.delivery.mumbai@rentease.com',
    password: 'Demo@1234',
    phone: '9000000015',
    vehicleType: 'van',
    vehicleNumber: 'MH21DP9012',
    licenseNumber: 'DLMUM0001',
  },
};

module.exports = { DEMO_ACCOUNTS, DELIVERY_PARTNERS_BY_CITY };
