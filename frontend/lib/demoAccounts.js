// Publicly-known demo credentials for one-click login buttons — mirrors the accounts the
// backend seeds in backend/src/constants/demoAccounts.js (only meaningful in Demo Mode).
// Keep both files in sync if these ever change.
export const DEMO_ACCOUNTS = {
  customer: {
    role: 'customer',
    label: 'Demo Customer',
    name: 'Demo Customer',
    email: 'demo.customer@rentease.com',
    password: 'Demo@1234',
    fields: [
      { label: 'Email', value: 'demo.customer@rentease.com' },
      { label: 'Password', value: 'Demo@1234' },
    ],
  },
  vendor: {
    role: 'vendor',
    label: 'Demo Vendor',
    name: 'Demo Vendor',
    email: 'demo.vendor@rentease.com',
    password: 'Demo@1234',
    fields: [
      { label: 'Vendor name', value: 'Demo Vendor' },
      { label: 'Email', value: 'demo.vendor@rentease.com' },
      { label: 'Password', value: 'Demo@1234' },
      { label: 'Business name', value: 'Demo Vendor Co.' },
      { label: 'Operating city', value: 'Hyderabad' },
      { label: 'Status', value: 'Approved', highlight: true },
    ],
  },
  // The original single account — kept as-is (still Hyderabad) so every existing reference to
  // DEMO_ACCOUNTS.delivery_partner keeps working. DELIVERY_PARTNER_BY_CITY below (Hyderabad is
  // an alias of this same entry, not a duplicate) is what the login page actually uses to pick
  // a city-specific account.
  delivery_partner: {
    role: 'delivery_partner',
    label: 'Demo Delivery Partner',
    name: 'Demo Delivery Partner',
    email: 'demo.delivery@rentease.com',
    password: 'Demo@1234',
    fields: [
      { label: 'Name', value: 'Demo Delivery Partner' },
      { label: 'Email', value: 'demo.delivery@rentease.com' },
      { label: 'Password', value: 'Demo@1234' },
      { label: 'Vehicle', value: 'Bike · TS09AB1234' },
      { label: 'Assigned city', value: 'Hyderabad' },
    ],
  },
  admin: {
    role: 'admin',
    label: 'Demo Admin',
    name: 'Demo Admin',
    email: 'admin@rentease.com',
    password: 'Admin@123',
    fields: [
      { label: 'Email', value: 'admin@rentease.com' },
      { label: 'Password', value: 'Admin@123' },
      { label: '2FA', value: 'Required on first login', highlight: true },
    ],
  },
};

// One real, distinct login-able Delivery Partner demo account per city — each with its own
// genuinely different seeded Requests/Assigned/History/Notifications/Messages/Earnings/
// Analytics (see backend/src/seed.js's seedHeadlineDeliveryPartners). Hyderabad here is an
// alias of DEMO_ACCOUNTS.delivery_partner above, not a second account. Keep in sync with
// backend/src/constants/demoAccounts.js's DELIVERY_PARTNERS_BY_CITY.
export const DELIVERY_PARTNER_BY_CITY = {
  Hyderabad: DEMO_ACCOUNTS.delivery_partner,
  Bengaluru: {
    role: 'delivery_partner',
    label: 'Demo Delivery Partner',
    name: 'Kavya Reddy',
    email: 'demo.delivery.bengaluru@rentease.com',
    password: 'Demo@1234',
    fields: [
      { label: 'Name', value: 'Kavya Reddy' },
      { label: 'Email', value: 'demo.delivery.bengaluru@rentease.com' },
      { label: 'Password', value: 'Demo@1234' },
      { label: 'Vehicle', value: 'Bike · KA05DP1234' },
      { label: 'Assigned city', value: 'Bengaluru' },
    ],
  },
  Chennai: {
    role: 'delivery_partner',
    label: 'Demo Delivery Partner',
    name: 'Arun Kumar',
    email: 'demo.delivery.chennai@rentease.com',
    password: 'Demo@1234',
    fields: [
      { label: 'Name', value: 'Arun Kumar' },
      { label: 'Email', value: 'demo.delivery.chennai@rentease.com' },
      { label: 'Password', value: 'Demo@1234' },
      { label: 'Vehicle', value: 'Bike · TN09DP5678' },
      { label: 'Assigned city', value: 'Chennai' },
    ],
  },
  Mumbai: {
    role: 'delivery_partner',
    label: 'Demo Delivery Partner',
    name: 'Rohan Deshmukh',
    email: 'demo.delivery.mumbai@rentease.com',
    password: 'Demo@1234',
    fields: [
      { label: 'Name', value: 'Rohan Deshmukh' },
      { label: 'Email', value: 'demo.delivery.mumbai@rentease.com' },
      { label: 'Password', value: 'Demo@1234' },
      { label: 'Vehicle', value: 'Van · MH21DP9012' },
      { label: 'Assigned city', value: 'Mumbai' },
    ],
  },
};
