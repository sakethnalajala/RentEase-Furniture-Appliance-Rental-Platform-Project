const { productPlaceholderImage } = require('../utils/placeholderImage');
const { PRODUCT_CONDITION } = require('../constants/inventoryStatus');

// Real, verified stock photos per subcategory (~5-6 each) replace the generated SVG gradient
// placeholders. Falls back to the SVG generator per-subcategory if the real-image file is
// missing or that subcategory has no verified photos yet, so seeding never breaks waiting on
// image sourcing to be 100% complete.
let REAL_IMAGES = {};
try {
  REAL_IMAGES = require('./realProductImages');
} catch {
  REAL_IMAGES = {};
}

// One representative real photo per product (rotated through that subcategory's verified
// pool by product index), plus two more photos from the same pool for the gallery's other
// slots — real e-commerce catalogs commonly reuse a bounded set of category photography
// across similar-but-not-individually-photographed SKUs, which is also what keeps this fast:
// a ~150-image pool across the whole catalog means the browser has almost certainly already
// cached any given URL by the time a new product using it scrolls into view.
function productImages(seq, type, brand, i) {
  const pool = REAL_IMAGES[type];
  if (!pool || pool.length === 0) {
    return [
      productPlaceholderImage(seq, type, brand, 0),
      productPlaceholderImage(seq, type, brand, 1),
      productPlaceholderImage(seq, type, brand, 2),
    ];
  }
  const L = pool.length;
  return [pool[i % L], pool[(i + 1) % L], pool[(i + 2) % L]];
}

const CITY_NAMES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai'];
const CONDITIONS = Object.values(PRODUCT_CONDITION);
const COLORS = [
  'Walnut Brown',
  'Charcoal Grey',
  'Matte Black',
  'Classic White',
  'Beige',
  'Navy Blue',
  'Graphite',
  'Ivory',
  'Espresso',
  'Slate Grey',
  'Sage Green',
  'Terracotta',
];
const MODEL_SUFFIXES = [
  'Pro',
  'Plus',
  'Elite',
  'Comfort',
  'Classic',
  'Neo',
  'Max',
  'Studio',
  'Prime',
  'Edge',
  'Air',
  'Signature',
  'Series X',
  'Lite',
];
const INSTALL_REQUIRED_TYPES = new Set([
  'Air Conditioners',
  'Washing Machines',
  'Water Purifiers',
  'Wardrobes',
  'Dishwashers',
  'Water Heaters',
]);

const FURNITURE_TYPES = [
  { type: 'Beds', brands: ['Urban Ladder', 'Nilkamal', 'Durian', 'Godrej Interio'], price: [1200, 2600], depositX: 3 },
  { type: 'Sofas', brands: ['Urban Ladder', 'Pepperfry', 'Durian', 'HomeTown'], price: [1800, 3600], depositX: 3 },
  { type: 'Office Chairs', brands: ['Featherlite', 'Green Soul', 'Nilkamal', 'Da Urban'], price: [500, 1200], depositX: 2 },
  { type: 'Gaming Chairs', brands: ['Green Soul', 'Cellbell', 'Da Urban', 'Featherlite'], price: [700, 1600], depositX: 2 },
  { type: 'Dining Tables', brands: ['Urban Ladder', 'Durian', 'HomeTown', 'Pepperfry'], price: [1500, 3100], depositX: 3 },
  { type: 'Coffee Tables', brands: ['Urban Ladder', 'Nilkamal', 'Durian', 'HomeTown'], price: [600, 1300], depositX: 2 },
  { type: 'Study Tables', brands: ['Nilkamal', 'IKEA', 'Durian', 'Featherlite'], price: [700, 1500], depositX: 2.5 },
  { type: 'Wardrobes', brands: ['Godrej Interio', 'Nilkamal', 'Durian', 'Spacewood'], price: [1600, 3300], depositX: 3 },
  { type: 'TV Units', brands: ['Urban Ladder', 'Nilkamal', 'Durian', 'HomeTown'], price: [800, 1800], depositX: 2.5 },
  { type: 'Bookshelves', brands: ['Nilkamal', 'Urban Ladder', 'Durian', 'Spacewood'], price: [700, 1600], depositX: 2.5 },
  { type: 'Mattresses', brands: ['Kurl-on', 'Sleepwell', 'Wakefit', 'Duroflex'], price: [500, 1400], depositX: 2 },
  { type: 'Recliners', brands: ['Urban Ladder', 'Durian', 'HomeTown', 'Green Soul'], price: [2000, 4000], depositX: 3 },
];

const APPLIANCE_TYPES = [
  { type: 'Refrigerators', brands: ['LG', 'Samsung', 'Whirlpool', 'Haier'], price: [900, 2300], depositX: 3 },
  { type: 'Washing Machines', brands: ['LG', 'Samsung', 'IFB', 'Whirlpool'], price: [800, 2100], depositX: 3 },
  { type: 'Televisions', brands: ['Samsung', 'LG', 'Sony', 'Mi'], price: [700, 2600], depositX: 2.5 },
  { type: 'Microwaves', brands: ['IFB', 'Samsung', 'LG', 'Bajaj'], price: [400, 950], depositX: 2 },
  { type: 'Air Conditioners', brands: ['Voltas', 'LG', 'Daikin', 'Blue Star'], price: [1200, 2900], depositX: 3 },
  // `count` overrides PER_TYPE_COUNT_APPLIANCE below — Water Purifiers and Water Heaters are
  // genuinely scarce as real, on-topic, freely-licensed product photography (verified by
  // exhaustive Pexels/Pixabay search: every other appliance type cleared 36-44 distinct real
  // photos, these two topped out at 16 and 18). Capping the generated count at the real image
  // pool size guarantees zero duplicate photos — matching every other category — rather than
  // hitting the usual 36-per-type count and repeating photos across products, which is the one
  // thing this catalog must never do.
  { type: 'Water Purifiers', brands: ['Kent', 'Pureit', 'Aquaguard', 'Livpure'], price: [300, 750], depositX: 2, count: 16 },
  { type: 'Vacuum Cleaners', brands: ['Eureka Forbes', 'Kent', 'Philips', 'Dyson'], price: [500, 1450], depositX: 2 },
  { type: 'Air Coolers', brands: ['Symphony', 'Bajaj', 'Voltas', 'Crompton'], price: [350, 850], depositX: 2 },
  { type: 'Dishwashers', brands: ['IFB', 'Bosch', 'Siemens', 'LG'], price: [900, 2000], depositX: 3 },
  { type: 'Mixers', brands: ['Bajaj', 'Preethi', 'Philips', 'Butterfly'], price: [200, 500], depositX: 1.5 },
  { type: 'Induction Stoves', brands: ['Prestige', 'Philips', 'Bajaj', 'Pigeon'], price: [250, 600], depositX: 1.5 },
  { type: 'Water Heaters', brands: ['Bajaj', 'Havells', 'Racold', 'AO Smith'], price: [350, 800], depositX: 2, count: 18 },
  { type: 'Kitchen Appliances', brands: ['Prestige', 'Philips', 'Bajaj', 'Morphy Richards'], price: [300, 900], depositX: 1.5 },
  { type: 'Home Appliances', brands: ['Havells', 'Crompton', 'Orient', 'Bajaj'], price: [300, 1100], depositX: 1.5 },
];

const PER_TYPE_COUNT_FURNITURE = 44; // 12 types x 44 = 528
const PER_TYPE_COUNT_APPLIANCE = 36; // 14 types x 36 = 504

const randomInRange = (min, max) => Math.round(min + Math.random() * (max - min));
const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * @param {{ furnitureCategoryId: string, applianceCategoryId: string, cityIdsByName: Record<string,string>, vendorPoolByCity: Record<string,string[]> }} ctx
 * vendorPoolByCity: per-city array of vendor _ids to round-robin non-RentEase-owned products
 * across (a vendor id can appear multiple times in its city's array to weight it more heavily —
 * used to keep the login-able demo vendor's catalog rich alongside its city's other vendors).
 * @returns {object[]} plain objects ready for Product.insertMany
 */
function generateDemoProducts({ furnitureCategoryId, applianceCategoryId, cityIdsByName, vendorPoolByCity }) {
  const products = [];
  let seq = 1;
  // Per-city round-robin cursor for vendor assignment — using the global `seq` for this (which
  // only touches a given city every few iterations) landed on the same handful of modulo
  // classes every time and left some vendors with zero products purely by coincidence; a
  // dedicated per-city counter guarantees even distribution across every city's vendor pool.
  const vendorCursorByCity = {};

  const buildForType = (categoryId, def, countPerType) => {
    const { type, brands, price, depositX } = def;
    for (let i = 0; i < countPerType; i++) {
      const brand = brands[i % brands.length];
      const cityName = CITY_NAMES[i % CITY_NAMES.length];
      const cityId = cityIdsByName[cityName];
      const monthlyRentalPrice = randomInRange(price[0], price[1]);
      const securityDeposit = Math.round(monthlyRentalPrice * depositX);
      const isRentEaseOwned = i % 3 === 0;
      const cityVendors = vendorPoolByCity[cityName] || [];
      let vendorForProduct = null;
      if (!isRentEaseOwned && cityVendors.length) {
        const cursor = vendorCursorByCity[cityName] || 0;
        vendorForProduct = cityVendors[cursor % cityVendors.length];
        vendorCursorByCity[cityName] = cursor + 1;
      }
      const hasDiscount = seq % 3 === 0; // ~1/3 of the catalog carries a demo discount badge
      // seq is always a multiple of 3 here, so indexing by seq % 6 (a multiple of 3) only ever
      // yields 0 or 3 -> just two tiers ever appeared. Use a coprime step so all six show up.
      const discountPercent = hasDiscount ? [10, 15, 20, 25, 30, 40][(seq / 3) % 6] : 0;
      const modelName = `${brand} ${type.replace(/s$/, '')} ${MODEL_SUFFIXES[(i + seq) % MODEL_SUFFIXES.length]}`;

      products.push({
        vendor: vendorForProduct,
        isRentEaseOwned,
        name: modelName,
        category: categoryId,
        subCategory: type,
        brand,
        model: `${slug(brand)}-${100 + seq}`,
        description: `Well-maintained ${type.toLowerCase()} from ${brand}, available for monthly rental in ${cityName}. Flexible plans, free delivery scheduling, and hassle-free returns.`,
        // A 3-shot "gallery": a main image plus two alternate views.
        images: productImages(seq, type, brand, i),
        purchaseYear: 2021 + (seq % 4),
        condition: CONDITIONS[seq % CONDITIONS.length],
        color: COLORS[seq % COLORS.length],
        sku: `${slug(type)}-${slug(cityName)}-${seq}`,
        stock: 1 + (seq % 6),
        city: cityId,
        monthlyRentalPrice,
        securityDeposit,
        minRentalPeriodMonths: 1,
        maxRentalPeriodMonths: 12,
        deliveryCharge: monthlyRentalPrice > 2000 ? 0 : randomInRange(99, 299),
        estimatedDeliveryDays: 1 + (seq % 4),
        installationRequired: INSTALL_REQUIRED_TYPES.has(type),
        availabilityStatus: 'active',
        isActive: true,
        averageRating: Number((3.6 + Math.random() * 1.3).toFixed(1)),
        numReviews: 5 + (seq % 180),
        discountPercent,
        unitsRented: 8 + (seq % 420),
      });
      seq++;
    }
  };

  FURNITURE_TYPES.forEach((def) => buildForType(furnitureCategoryId, def, def.count || PER_TYPE_COUNT_FURNITURE));
  APPLIANCE_TYPES.forEach((def) => buildForType(applianceCategoryId, def, def.count || PER_TYPE_COUNT_APPLIANCE));

  return products;
}

module.exports = {
  generateDemoProducts,
  FURNITURE_TYPES,
  APPLIANCE_TYPES,
  // Exposed for vendorOnboardingService.js, which generates a smaller, independently-seeded
  // per-vendor catalog at approval time and needs the same real image pools/brand/price/
  // condition data (not a second, divergent copy of it) to stay visually and structurally
  // consistent with the main demo catalog.
  productImages,
  COLORS,
  MODEL_SUFFIXES,
  CONDITIONS,
  INSTALL_REQUIRED_TYPES,
  slug,
  randomInRange,
};
