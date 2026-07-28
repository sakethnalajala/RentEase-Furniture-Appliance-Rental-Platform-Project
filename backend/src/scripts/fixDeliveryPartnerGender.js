const DeliveryPartner = require('../models/DeliveryPartner');
const User = require('../models/User');
const logger = require('../utils/logger');
const { avatarUrl } = require('../data/demoDeliveryData');

// First names that appear in any of this app's delivery-partner demo-data pools
// (demoDeliveryData.js's DEMO_DELIVERY_PARTNERS, demoAccounts.js's DELIVERY_PARTNERS_BY_CITY,
// and the female half of demoScaleData.js's shared FIRST_NAMES pool used for the 48 bulk
// city-scale records) that read as female — used to find already-seeded records to rename.
const FEMALE_FIRST_NAMES = new Set([
  'Anjali', 'Sunita', 'Geeta', 'Meenakshi', 'Lakshmi', 'Divya', 'Kavya',
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Ira', 'Myra', 'Anika', 'Riya', 'Ishita',
  'Priya', 'Sneha', 'Neha', 'Pooja', 'Meera', 'Nisha', 'Swati', 'Tanvi', 'Radhika',
]);

const MALE_FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Kabir', 'Aryan', 'Dhruv', 'Kunal', 'Yash', 'Varun', 'Siddharth', 'Nikhil', 'Rahul', 'Karan',
  'Amit', 'Rajesh', 'Sanjay', 'Manish', 'Deepak', 'Ashok', 'Vijay', 'Anand', 'Gaurav', 'Naveen',
];
const LAST = [
  'Sharma', 'Verma', 'Gupta', 'Reddy', 'Rao', 'Nair', 'Patel', 'Singh', 'Kumar', 'Iyer',
  'Menon', 'Joshi', 'Agarwal', 'Shah', 'Chauhan', 'Malhotra', 'Kapoor', 'Bhatt', 'Desai', 'Pillai',
  'Krishnan', 'Subramaniam', 'Mehta', 'Chandran', 'Naidu', 'Deshmukh', 'Kulkarni', 'Pawar', 'Yadav', 'Ahmed',
];

function isFemaleName(fullName) {
  const first = (fullName || '').trim().split(/\s+/)[0];
  return FEMALE_FIRST_NAMES.has(first);
}

// One-time, in-place rename of every already-seeded delivery-partner User whose demo name
// reads as female — swaps in a fresh male name + matching avatar/email, touches nothing else
// (no records created or deleted, no other role affected).
async function fixDeliveryPartnerGender({ dryRun = false } = {}) {
  const partners = await DeliveryPartner.find({}).populate('user', 'name email avatar');
  const changed = [];
  let idx = 0;

  for (const partner of partners) {
    const user = partner.user;
    if (!user || !isFemaleName(user.name)) continue;

    // Prime-step offset on the surname index so it doesn't stay locked to the same value for
    // the first MALE_FIRST.length renames (dividing would give everyone "Sharma" until the
    // 30th rename) — every one of the first min(30,30) renames gets a genuinely distinct
    // first+last combination instead.
    const first = MALE_FIRST[idx % MALE_FIRST.length];
    const last = LAST[(idx * 7 + 3) % LAST.length];
    const newName = `${first} ${last}`;
    idx++;

    const domain = (user.email || '').split('@')[1] || 'rentease-fleet.com';
    const newEmail = `${first}.${last}.${String(partner._id).slice(-5)}@${domain}`.toLowerCase();
    const newAvatar = avatarUrl(`${newName}-${partner._id}`);

    changed.push({ before: user.name, after: newName });
    if (!dryRun) {
      await User.findByIdAndUpdate(user._id, { name: newName, email: newEmail, avatar: newAvatar });
    }
  }

  logger.success(`Delivery-partner gender fix-up: ${changed.length} of ${partners.length} renamed.`);
  return { totalPartners: partners.length, renamed: changed.length, changes: changed };
}

module.exports = { fixDeliveryPartnerGender };
