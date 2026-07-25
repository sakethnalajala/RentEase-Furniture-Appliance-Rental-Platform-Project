// Delivery Messages — same honest pattern as the Vendor portal's `buildVendorMessages`
// (see frontend/lib/mockVendorData.js): there is no real chat backend for delivery-partner
// coordination (see backend/src/routes/index.js roadmap comments — only Order/OrderItem +
// the generic Notification model exist). Per product direction this page ships fully
// interactive today using demo conversation threads synthesized from the delivery partner's
// REAL assigned/history OrderItems — real vendor business names, real customer names, real
// product names, pulled live from MongoDB — wrapped in plausible delivery-coordination
// dialogue. Not a "coming soon" placeholder, and not fabricated as a genuine chat log either:
// it's clearly demo dialogue layered on real order data, deterministic per item so the same
// partner sees the same threads across reloads.

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Cheap deterministic numeric seed from an OrderItem's Mongo ObjectId string (or any string).
function seedFromId(id, salt = 0) {
  const str = String(id || 'seed');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 100000) + salt + 1;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const VENDOR_OPENERS = [
  'Please pick up by 5pm today.',
  'The package is packed and ready at the warehouse.',
  "It's a fragile appliance — please handle it carefully in transit.",
  "Let us know once you've picked it up.",
  'Can you confirm the pickup time for this order?',
  "There's a second box that goes with this — please take both.",
  'The customer requested morning delivery if possible.',
];
const PARTNER_TO_VENDOR_REPLIES = [
  "On my way to pick it up now.",
  "Picked up, heading to the customer's address.",
  "Got it, will confirm once it's delivered.",
  "Sure, I'll be careful with it — noted.",
  "Will do, I'll grab both boxes together.",
  "Confirmed — I can be there within the hour.",
  "Understood, I'll prioritize the morning slot.",
];
const VENDOR_FOLLOWUPS = ['Perfect, thank you!', 'Appreciate it, keep us posted.', 'Great, thanks for confirming.'];

const CUSTOMER_OPENERS = [
  'Hi, when will my order arrive?',
  'Can you deliver after 6pm? I get home late.',
  "I'm not home right now, can you wait 10 minutes?",
  'Please call before you arrive.',
  'Is the OTP required for delivery? Just double-checking.',
  'Which floor — should I come down or will you come up?',
  'Can you leave it with the security guard if I miss you?',
];
const PARTNER_TO_CUSTOMER_REPLIES = [
  "I'm about 10 minutes away.",
  "Sure, I'll wait for you outside.",
  "No problem, I'll call you when I'm close.",
  'Yes, please keep the 4-digit OTP ready for handover.',
  "I'll come up — which door number?",
  'Left it at the reception as requested.',
  "I'm right outside your gate now.",
];
const CUSTOMER_FOLLOWUPS = ['Perfect, thank you!', 'Great, see you soon.', 'Thanks for the update!', 'Awesome, appreciate it.'];

function buildConversation(rand, seedBase, openers, myReplies, followups, startDaysAgo) {
  const baseTime = daysAgo(startDaysAgo);
  baseTime.setHours(9 + Math.floor(rand() * 9), Math.floor(rand() * 60), 0, 0);
  let cursor = baseTime;
  const conversation = [];

  const addMessage = (sender, text, minutesLater = 0) => {
    cursor = new Date(cursor.getTime() + minutesLater * 60000);
    conversation.push({ id: `${seedBase}-${conversation.length}`, sender, text, timestamp: new Date(cursor) });
  };

  addMessage('them', openers[seedBase % openers.length]);
  addMessage('me', myReplies[seedBase % myReplies.length], 3 + Math.floor(rand() * 15));
  if (rand() > 0.3) {
    addMessage('them', followups[(seedBase + 1) % followups.length], 2 + Math.floor(rand() * 10));
  }
  if (rand() > 0.65) {
    addMessage('them', openers[(seedBase + 2) % openers.length], 20 + Math.floor(rand() * 90));
    addMessage('me', myReplies[(seedBase + 2) % myReplies.length], 4 + Math.floor(rand() * 12));
  }

  return conversation;
}

// `items` should be the delivery partner's real OrderItems (assigned + history combined),
// each populated with `product`, `vendor`, `order.customer`, `order.orderNumber`, `status`.
// Produces up to `count` threads total, alternating a "Chat with Vendor" and a "Chat with
// Customer" thread per item so both coordination angles show up in the inbox.
export function buildDeliveryMessages(items, count = 10) {
  if (!items?.length) return [];
  const list = [];

  for (let i = 0; i < items.length && list.length < count; i++) {
    const item = items[i];
    const product = item.product;
    const vendorName = item.vendor?.businessName || 'Vendor';
    const customerName = item.order?.customer?.name || 'Customer';
    const orderNumber = item.order?.orderNumber || '';

    const vendorSeed = seedFromId(item._id, 1);
    const vendorRand = seededRandom(vendorSeed);
    const vendorConversation = buildConversation(
      vendorRand, vendorSeed, VENDOR_OPENERS, PARTNER_TO_VENDOR_REPLIES, VENDOR_FOLLOWUPS, i + 1
    );
    const lastVendorMsg = vendorConversation[vendorConversation.length - 1];
    list.push({
      id: `dv-${item._id}`,
      counterpartType: 'vendor',
      counterpartName: vendorName,
      product,
      orderNumber,
      conversation: vendorConversation,
      lastMessage: lastVendorMsg.text,
      lastSender: lastVendorMsg.sender,
      unread: i < 2,
      updatedAt: lastVendorMsg.timestamp,
    });

    if (list.length >= count) break;

    const customerSeed = seedFromId(item._id, 2);
    const customerRand = seededRandom(customerSeed);
    const customerConversation = buildConversation(
      customerRand, customerSeed, CUSTOMER_OPENERS, PARTNER_TO_CUSTOMER_REPLIES, CUSTOMER_FOLLOWUPS, i
    );
    const lastCustomerMsg = customerConversation[customerConversation.length - 1];
    list.push({
      id: `dc-${item._id}`,
      counterpartType: 'customer',
      counterpartName: customerName,
      product,
      orderNumber,
      conversation: customerConversation,
      lastMessage: lastCustomerMsg.text,
      lastSender: lastCustomerMsg.sender,
      unread: i < 3,
      updatedAt: lastCustomerMsg.timestamp,
    });
  }

  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}
