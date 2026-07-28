// City-scale demo data generators — layered ON TOP of the existing hand-authored pools in
// demoDeliveryData.js (DEMO_CUSTOMERS/DEMO_DELIVERY_PARTNERS/EXTRA_VENDORS, which stay exactly
// as they are since demoOrderService.js depends on DEMO_CUSTOMERS at runtime, not just at seed
// time). This file exists to guarantee a real, database-driven minimum per city — >=50
// customers, >=10 vendors, >=10 delivery partners — via combinatorial name/area generation
// rather than hand-writing 250+ literal records.
const { avatarUrl } = require('./demoDeliveryData');

const CITY_META = {
  Hyderabad: { gstState: '36', pincodeBase: 500, vehiclePrefix: 'TS' },
  Bengaluru: { gstState: '29', pincodeBase: 560, vehiclePrefix: 'KA' },
  Chennai: { gstState: '33', pincodeBase: 600, vehiclePrefix: 'TN' },
  Mumbai: { gstState: '27', pincodeBase: 400, vehiclePrefix: 'MH' },
};

const AREA_BY_CITY = {
  Hyderabad: ['Gachibowli', 'Madhapur', 'Kondapur', 'Banjara Hills', 'Jubilee Hills', 'Ameerpet', 'Kukatpally', 'Secunderabad', 'Begumpet', 'Dilsukhnagar', 'Miyapur', 'LB Nagar'],
  Bengaluru: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Jayanagar', 'Marathahalli', 'Electronic City', 'MG Road', 'BTM Layout', 'Yelahanka', 'Rajajinagar', 'Malleshwaram'],
  Chennai: ['T Nagar', 'Adyar', 'Anna Nagar', 'Velachery', 'Nungambakkam', 'Mylapore', 'Porur', 'OMR', 'Guindy', 'Tambaram', 'Kilpauk', 'Ashok Nagar'],
  Mumbai: ['Andheri', 'Bandra', 'Powai', 'Malad', 'Borivali', 'Thane', 'Dadar', 'Chembur', 'Goregaon', 'Navi Mumbai', 'Kandivali', 'Vikhroli'],
};

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Kabir', 'Aryan', 'Dhruv', 'Kunal', 'Yash', 'Varun', 'Siddharth', 'Nikhil', 'Rahul', 'Karan',
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kavya', 'Ira', 'Myra', 'Anika', 'Riya', 'Ishita',
  'Priya', 'Sneha', 'Neha', 'Pooja', 'Divya', 'Meera', 'Nisha', 'Swati', 'Tanvi', 'Radhika',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Reddy', 'Rao', 'Nair', 'Patel', 'Singh', 'Kumar', 'Iyer',
  'Menon', 'Joshi', 'Agarwal', 'Shah', 'Chauhan', 'Malhotra', 'Kapoor', 'Bhatt', 'Desai', 'Pillai',
  'Krishnan', 'Subramaniam', 'Mehta', 'Chandran', 'Naidu', 'Deshmukh', 'Kulkarni', 'Pawar', 'Sheikh', 'Ahmed',
];

const BUSINESS_PREFIXES = ['Urban', 'Metro', 'Comfort', 'Prime', 'Elite', 'Royal', 'Smart', 'Cozy', 'Modern', 'Classic', 'Swift', 'Zenith'];
const BUSINESS_SUFFIXES = ['Furnishings', 'Rentals', 'Home Solutions', 'Living', 'Furniture Hub', 'Appliance Care', 'Decor', 'Interiors', 'Rental Co.', 'Living Spaces'];

const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
const cityCode = (cityName) => cityName.slice(0, 3).toUpperCase();

function nameForIndex(cityIdx, i) {
  const offset = cityIdx * 137 + i;
  const first = FIRST_NAMES[offset % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(offset / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

// Male-only subset (the first half of FIRST_NAMES) used specifically for delivery-partner
// generation — per product direction, every delivery partner profile is a male name/avatar,
// while customer/vendor generation above keeps drawing from the full, gender-mixed pool.
const MALE_FIRST_NAMES = FIRST_NAMES.slice(0, 20);
function maleNameForIndex(cityIdx, i) {
  const offset = cityIdx * 137 + i;
  const first = MALE_FIRST_NAMES[offset % MALE_FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(offset / MALE_FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function areaForIndex(cityName, i) {
  const areas = AREA_BY_CITY[cityName] || AREA_BY_CITY.Hyderabad;
  return areas[i % areas.length];
}

function pincodeFor(cityName, i) {
  const base = (CITY_META[cityName] || CITY_META.Hyderabad).pincodeBase;
  return `${base}${String(10 + (i % 89)).padStart(3, '0')}`;
}

function gstFor(cityName, i) {
  const stateCode = (CITY_META[cityName] || CITY_META.Hyderabad).gstState;
  const letters = LAST_NAMES[i % LAST_NAMES.length].slice(0, 5).toUpperCase().padEnd(5, 'X');
  return `${stateCode}${letters}${(1000 + i) % 10000}${String.fromCharCode(65 + (i % 26))}1Z${(i % 9) + 1}`;
}

function panFor(cityName, i) {
  const letters = LAST_NAMES[i % LAST_NAMES.length].slice(0, 5).toUpperCase().padEnd(5, 'X');
  return `${letters}${(1000 + i) % 10000}${String.fromCharCode(65 + ((i + 3) % 26))}`;
}

function vehicleNumberFor(cityName, i) {
  const prefix = (CITY_META[cityName] || CITY_META.Hyderabad).vehiclePrefix;
  const l1 = String.fromCharCode(65 + (i % 26));
  const l2 = String.fromCharCode(65 + ((i + 7) % 26));
  return `${prefix}${String(10 + (i % 89)).padStart(2, '0')}${l1}${l2}${String(1000 + i).slice(-4)}`;
}

/** Generates `count` new customers for a city — real names, real Address-shaped fields. */
function generateCityCustomers(cityName, cityIdx, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const name = nameForIndex(cityIdx, i);
    const emailSlug = `${slug(name)}.${cityCode(cityName)}${i}`;
    out.push({
      name,
      email: `${emailSlug}@rentease-customers.com`,
      phone: `9${cityIdx + 3}${String(100000 + i).slice(-6)}`,
      avatar: avatarUrl(`${name}-${cityCode(cityName)}-${i}`),
      area: areaForIndex(cityName, i),
      pincode: pincodeFor(cityName, i),
      addressLine1: `${10 + (i % 90)}, ${areaForIndex(cityName, i)} Main Road`,
    });
  }
  return out;
}

/** Generates `count` new approved vendors for a city. */
function generateCityVendors(cityName, cityIdx, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const ownerName = nameForIndex(cityIdx, i + 400);
    const businessName = `${BUSINESS_PREFIXES[(cityIdx * 5 + i) % BUSINESS_PREFIXES.length]} ${BUSINESS_SUFFIXES[(cityIdx * 3 + i) % BUSINESS_SUFFIXES.length]}`;
    const emailSlug = `${slug(businessName)}.${cityCode(cityName)}${i}`;
    out.push({
      ownerName,
      businessName,
      email: `${emailSlug}@rentease-bizowners.com`,
      phone: `9${cityIdx + 4}${String(200000 + i).slice(-6)}`,
      avatar: avatarUrl(`${ownerName}-vendor-${cityCode(cityName)}-${i}`),
      area: areaForIndex(cityName, i + 5),
      businessAddress: `${20 + (i % 80)}, ${areaForIndex(cityName, i + 5)}, ${cityName}`,
      gstNumber: gstFor(cityName, i),
      panNumber: panFor(cityName, i),
    });
  }
  return out;
}

/** Generates `count` new approved delivery partners for a city. */
function generateCityDeliveryPartners(cityName, cityIdx, count) {
  const vehicleTypes = ['bike', 'bike', 'bike', 'van', 'truck'];
  const out = [];
  for (let i = 0; i < count; i++) {
    const name = maleNameForIndex(cityIdx, i + 800);
    const emailSlug = `${slug(name)}.${cityCode(cityName)}${i}`;
    out.push({
      name,
      email: `${emailSlug}@rentease-fleet.com`,
      phone: `9${cityIdx + 5}${String(300000 + i).slice(-6)}`,
      avatar: avatarUrl(`${name}-dp-${cityCode(cityName)}-${i}`),
      area: areaForIndex(cityName, i + 3),
      vehicleType: vehicleTypes[i % vehicleTypes.length],
      vehicleNumber: vehicleNumberFor(cityName, i),
      licenseNumber: `DL${2016 + (i % 9)}${cityCode(cityName)}${String(1000 + i).slice(-4)}`,
      rating: Number((3.9 + Math.random() * 1.1).toFixed(1)),
      isAvailable: Math.random() > 0.15,
      isOnline: Math.random() > 0.2,
      totalDistanceCovered: Math.floor(50 + Math.random() * 900),
    });
  }
  return out;
}

module.exports = {
  AREA_BY_CITY,
  CITY_META,
  generateCityCustomers,
  generateCityVendors,
  generateCityDeliveryPartners,
};
