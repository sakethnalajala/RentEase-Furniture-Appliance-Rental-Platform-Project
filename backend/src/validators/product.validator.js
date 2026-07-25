const { z } = require('zod');

const listProductsQuerySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  search: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating', 'newest', 'popular', 'best_selling', 'discount']).optional(),
  minDiscount: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

module.exports = { listProductsQuerySchema };
