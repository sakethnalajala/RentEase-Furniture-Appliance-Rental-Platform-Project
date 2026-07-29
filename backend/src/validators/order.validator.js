const { z } = require('zod');
const { PAYMENT_METHOD } = require('../constants/orderStatus');

const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'productId is required.'),
  rentalPlanId: z.string().min(1, 'rentalPlanId is required.'),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

const deliveryAddressSchema = z.object({
  contactName: z.string().min(1, 'Contact name is required.'),
  contactPhone: z.string().min(6, 'Contact phone is required.'),
  addressLine1: z.string().min(1, 'Address line 1 is required.'),
  addressLine2: z.string().optional().default(''),
  city: z.string().min(1, 'City is required.'),
  state: z.string().optional().default(''),
  pincode: z.string().optional().default(''),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required.'),
  deliveryAddress: deliveryAddressSchema,
  paymentMethod: z.enum(Object.values(PAYMENT_METHOD)),
  // When checkout was initiated from the cart, these cart item _ids are removed once the
  // order is placed (a direct "Rent Now" checkout never sends this).
  clearCartItemIds: z.array(z.string()).optional().default([]),
});

module.exports = { checkoutSchema };
