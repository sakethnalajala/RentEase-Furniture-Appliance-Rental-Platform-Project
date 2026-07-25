const { z } = require('zod');

const updateVendorProfileSchema = z.object({
  businessName: z.string().min(1).optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  description: z.string().max(2000).optional(),
  city: z.string().min(1).optional(),
  operatingCities: z.array(z.string()).optional(),
  warehouseLocation: z
    .object({
      name: z.string().optional().default(''),
      address: z.string().optional().default(''),
      lat: z.coerce.number().optional(),
      lng: z.coerce.number().optional(),
    })
    .optional(),
  bankDetails: z
    .object({
      accountHolderName: z.string().optional().default(''),
      accountNumber: z.string().optional().default(''),
      ifsc: z.string().optional().default(''),
    })
    .optional(),
});

module.exports = { updateVendorProfileSchema };
