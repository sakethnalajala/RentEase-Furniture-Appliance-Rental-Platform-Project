// Per-vendor OrderItem lifecycle. A parent Order can contain OrderItems from several
// vendors; each OrderItem advances through this lifecycle independently.
const ORDER_ITEM_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  ACTIVE_RENTAL: 'active_rental',
  EXTENSION_REQUESTED: 'extension_requested',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  RETURNED: 'returned',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

// Terminal / semi-terminal states after which cancellation is no longer allowed.
const NON_CANCELLABLE_STATUSES = [
  ORDER_ITEM_STATUS.OUT_FOR_DELIVERY,
  ORDER_ITEM_STATUS.DELIVERED,
  ORDER_ITEM_STATUS.ACTIVE_RENTAL,
  ORDER_ITEM_STATUS.EXTENSION_REQUESTED,
  ORDER_ITEM_STATUS.PICKUP_SCHEDULED,
  ORDER_ITEM_STATUS.RETURNED,
  ORDER_ITEM_STATUS.COMPLETED,
  ORDER_ITEM_STATUS.CANCELLED,
];

// Parent Order status is an aggregate/summary derived from its OrderItems.
const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PARTIALLY_CONFIRMED: 'partially_confirmed',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

const PAYMENT_METHOD = Object.freeze({
  UPI: 'upi',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  NET_BANKING: 'net_banking',
  COD: 'cod',
});

module.exports = {
  ORDER_ITEM_STATUS,
  NON_CANCELLABLE_STATUSES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
};
