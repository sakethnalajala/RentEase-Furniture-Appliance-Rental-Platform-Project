// Shared demo-data pools for the delivery workflow: additional named customers (so orders/
// messages/reviews stop all showing "Demo Customer"), additional delivery partners (so the
// vendor's Delivery Partner Management screen has real variety to show), and a canned pool of
// realistic delivery-experience reviews. Consumed by both seed.js (initial seed) and
// demoOrderService.js (runtime top-up), so both paths produce data that looks like it came
// from the same place — because it does.

// DiceBear's `avataaars` set is a free, no-auth-required, deterministic (same seed -> same
// image) illustrated-avatar generator — appropriate for demo accounts since it never claims to
// be a real person's photo, unlike scraping stock photography of actual people would be.
const avatarUrl = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;

const DEMO_CUSTOMERS = [
  'Rahul Sharma', 'Priya Reddy', 'Arjun Patel', 'Sneha Gupta', 'Rohit Kumar',
  'Kavya Nair', 'Akash Singh', 'Divya Verma', 'Karthik Reddy', 'Meera Joshi',
  'Harsha Rao', 'Neha Agarwal', 'Vikram Shah', 'Pooja Menon', 'Ankit Jain',
  'Aman Verma', 'Rakesh Kumar', 'Suresh Reddy', 'Nikhil Sharma', 'Aditi Rao',
  'Sanjana Patel', 'Vishal Gupta', 'Keerthi Nair', 'Deepak Singh', 'Anusha Reddy',
].map((name, i) => {
  const slug = name.toLowerCase().replace(/\s+/g, '.');
  return {
    name,
    email: `${slug}@example.com`,
    phone: `90000${String(10 + i).padStart(3, '0')}`,
    avatar: avatarUrl(name),
  };
});

const DEMO_DELIVERY_PARTNERS = [
  { name: 'Suresh Yadav', vehicleType: 'bike', vehicleNumber: 'TS09CD5678', licenseNumber: 'DL2020IN0045', rating: 4.8, joinDaysAgo: 420, isAvailable: true, isOnline: true },
  { name: 'Ramesh Naidu', vehicleType: 'van', vehicleNumber: 'TS10EF9012', licenseNumber: 'DL2019IN0132', rating: 4.5, joinDaysAgo: 610, isAvailable: true, isOnline: true },
  { name: 'Arvind Deshmukh', vehicleType: 'bike', vehicleNumber: 'TS07GH3456', licenseNumber: 'DL2021IN0287', rating: 4.9, joinDaysAgo: 250, isAvailable: true, isOnline: true },
  { name: 'Vikram Chauhan', vehicleType: 'truck', vehicleNumber: 'TS08IJ7890', licenseNumber: 'DL2018IN0069', rating: 4.3, joinDaysAgo: 780, isAvailable: false, isOnline: true },
  { name: 'Manoj Tiwari', vehicleType: 'bike', vehicleNumber: 'TS11KL2345', licenseNumber: 'DL2021IN0311', rating: 4.6, joinDaysAgo: 190, isAvailable: true, isOnline: true },
  { name: 'Rajesh Rathore', vehicleType: 'bike', vehicleNumber: 'TS12MN6789', licenseNumber: 'DL2022IN0402', rating: 4.7, joinDaysAgo: 140, isAvailable: true, isOnline: true },
  { name: 'Farooq Sheikh', vehicleType: 'van', vehicleNumber: 'TS13OP0123', licenseNumber: 'DL2019IN0198', rating: 4.4, joinDaysAgo: 520, isAvailable: false, isOnline: false },
  { name: 'Mahesh Kulkarni', vehicleType: 'bike', vehicleNumber: 'TS14QR4567', licenseNumber: 'DL2022IN0455', rating: 4.9, joinDaysAgo: 95, isAvailable: true, isOnline: true },
  { name: 'Ravindra Pawar', vehicleType: 'truck', vehicleNumber: 'TS15ST8901', licenseNumber: 'DL2018IN0087', rating: 4.2, joinDaysAgo: 860, isAvailable: true, isOnline: false },
  { name: 'Karthik Iyer', vehicleType: 'bike', vehicleNumber: 'TS16UV2345', licenseNumber: 'DL2021IN0329', rating: 4.8, joinDaysAgo: 300, isAvailable: true, isOnline: true },
  { name: 'Zubair Ahmed', vehicleType: 'van', vehicleNumber: 'TS17WX6789', licenseNumber: 'DL2020IN0156', rating: 4.5, joinDaysAgo: 470, isAvailable: false, isOnline: true },
  { name: 'Vijay Prasad', vehicleType: 'bike', vehicleNumber: 'TS18YZ0123', licenseNumber: 'DL2022IN0488', rating: 4.7, joinDaysAgo: 75, isAvailable: true, isOnline: true },
  { name: 'Harpreet Singh', vehicleType: 'truck', vehicleNumber: 'TS19AB4567', licenseNumber: 'DL2019IN0221', rating: 4.3, joinDaysAgo: 640, isAvailable: true, isOnline: false },
  { name: 'Anand Chandran', vehicleType: 'bike', vehicleNumber: 'TS20CD8901', licenseNumber: 'DL2022IN0512', rating: 4.9, joinDaysAgo: 55, isAvailable: true, isOnline: true },
].map((p, i) => {
  const slug = p.name.toLowerCase().replace(/\s+/g, '.');
  return {
    ...p,
    email: `${slug}@rentease-partners.com`,
    phone: `90001${String(10 + i).padStart(3, '0')}`,
    avatar: avatarUrl(p.name),
  };
});

const EXTRA_VENDORS = [
  { businessName: 'Urban Comfort Rentals', ownerName: 'Sanjay Mehta', gstNumber: '36ABCUR1234F1Z1' },
  { businessName: 'HomeEase Furnishings', ownerName: 'Lakshmi Iyer', gstNumber: '36ABCHE5678F1Z2' },
  { businessName: 'QuickRent Appliances', ownerName: 'Farhan Ahmed', gstNumber: '36ABCQR9012F1Z3' },
].map((v, i) => {
  const slug = v.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '.');
  return {
    ...v,
    email: `${slug}@rentease-vendors.com`,
    phone: `90002${String(10 + i).padStart(3, '0')}`,
  };
});

const DELIVERY_REVIEWS = [
  { rating: 5, comment: 'Delivered on time.' },
  { rating: 5, comment: 'Very polite delivery partner.' },
  { rating: 4, comment: 'Good service.' },
  { rating: 5, comment: 'Package handled carefully.' },
  { rating: 4, comment: 'Reached a little late but delivery was smooth.' },
  { rating: 5, comment: 'Super quick and professional.' },
  { rating: 5, comment: 'Called ahead and delivered right on schedule.' },
  { rating: 4, comment: 'Item was in perfect condition, thanks!' },
  { rating: 5, comment: 'Best delivery experience so far.' },
  { rating: 3, comment: 'Delivery was okay, took a bit longer than expected.' },
  { rating: 5, comment: 'Extremely courteous and careful with the furniture.' },
  { rating: 4, comment: 'Smooth handover, no issues at all.' },
];

const DELIVERY_ADDRESSES = [
  { addressLine1: 'Flat 302, Lake View Residency', addressLine2: 'Kondapur' },
  { addressLine1: 'House No. 45, Sri Nagar Colony', addressLine2: 'Ameerpet' },
  { addressLine1: 'B-104, Prestige Falcon City', addressLine2: 'Banjara Hills' },
  { addressLine1: 'Plot 12, Jubilee Enclave', addressLine2: 'Gachibowli' },
  { addressLine1: 'Flat 901, My Home Bhooja', addressLine2: 'Madhapur' },
  { addressLine1: '2-3-45, Street No. 8', addressLine2: 'Dilsukhnagar' },
  { addressLine1: 'C-22, Aparna Sarovar', addressLine2: 'Nallagandla' },
  { addressLine1: 'Villa 7, Manjeera Trinity', addressLine2: 'KPHB Colony' },
];

module.exports = { avatarUrl, DEMO_CUSTOMERS, DEMO_DELIVERY_PARTNERS, EXTRA_VENDORS, DELIVERY_REVIEWS, DELIVERY_ADDRESSES };
