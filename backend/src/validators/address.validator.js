const { z } = require('zod');

const createAddressSchema = z.object({
  label: z.string().trim().min(1).default('Home'),
  contactName: z.string().trim().min(2),
  contactPhone: z.string().trim().min(10).max(15),
  addressLine1: z.string().trim().min(3),
  addressLine2: z.string().trim().optional(),
  city: z.string().min(1, 'City is required.'),
  state: z.string().trim().min(2),
  pincode: z.string().trim().min(4).max(10),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = createAddressSchema.partial();

module.exports = { createAddressSchema, updateAddressSchema };
