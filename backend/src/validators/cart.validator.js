const { z } = require('zod');

const addToCartSchema = z.object({
  productId: z.string().min(1, 'productId is required.'),
  rentalPlanId: z.string().min(1, 'rentalPlanId is required.'),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(10).optional(),
  rentalPlanId: z.string().min(1).optional(),
});

module.exports = { addToCartSchema, updateCartItemSchema };
