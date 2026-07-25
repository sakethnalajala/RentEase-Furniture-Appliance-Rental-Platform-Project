const { z } = require('zod');

const deliverItemSchema = z.object({
  otp: z.string().min(4, 'A valid OTP is required.').max(6),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

const updateProfileSchema = z.object({
  vehicleType: z.enum(['bike', 'van', 'truck']).optional(),
  vehicleNumber: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  assignedCity: z.string().min(1).optional(),
  bankDetails: z
    .object({
      accountHolderName: z.string().optional().default(''),
      accountNumber: z.string().optional().default(''),
      ifsc: z.string().optional().default(''),
    })
    .optional(),
});

module.exports = { deliverItemSchema, updateAvailabilitySchema, updateProfileSchema };
