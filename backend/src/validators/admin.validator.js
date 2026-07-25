const { z } = require('zod');
const { PRODUCT_CONDITION } = require('../constants/inventoryStatus');

const rejectVendorSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

const updateVendorSchema = z.object({
  businessName: z.string().trim().min(2).optional(),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  businessAddress: z.string().trim().optional(),
  area: z.string().trim().optional(),
  city: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const updateDeliveryPartnerSchema = z.object({
  vehicleType: z.enum(['bike', 'van', 'truck']).optional(),
  vehicleNumber: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  area: z.string().trim().optional(),
  assignedCity: z.string().trim().optional(),
  isAvailable: z.coerce.boolean().optional(),
  isOnline: z.coerce.boolean().optional(),
});

const createProductSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(1),
  subCategory: z.string().trim().optional().default(''),
  brand: z.string().trim().min(1),
  model: z.string().trim().optional(),
  description: z.string().trim().optional(),
  images: z.array(z.string()).optional().default([]),
  condition: z.enum(Object.values(PRODUCT_CONDITION)).optional(),
  color: z.string().trim().optional(),
  sku: z.string().trim().min(1),
  stock: z.coerce.number().min(0).default(1),
  city: z.string().trim().min(1),
  monthlyRentalPrice: z.coerce.number().min(0),
  securityDeposit: z.coerce.number().min(0),
  deliveryCharge: z.coerce.number().min(0).optional(),
  estimatedDeliveryDays: z.coerce.number().min(0).optional(),
  installationRequired: z.coerce.boolean().optional(),
  vendor: z.string().trim().optional().nullable(),
});

const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
  availabilityStatus: z.enum(['active', 'inactive']).optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

const rentalPlanSchema = z.object({
  durationMonths: z.coerce.number().refine((v) => [1, 3, 6, 12].includes(v), 'Must be 1, 3, 6, or 12.'),
  label: z.string().trim().min(1),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  isActive: z.coerce.boolean().optional(),
});

const updateSettingsSchema = z.object({
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  platformFeePercent: z.coerce.number().min(0).max(100).optional(),
  baseDeliveryFee: z.coerce.number().min(0).optional(),
  freeDeliveryThreshold: z.coerce.number().min(0).optional(),
  lateReturnFeePerDay: z.coerce.number().min(0).optional(),
  cancellationWindowHours: z.coerce.number().min(0).optional(),
  refundProcessingDays: z.coerce.number().min(0).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().optional(),
  cancellationPolicy: z.string().trim().optional(),
  refundPolicy: z.string().trim().optional(),
  privacyPolicy: z.string().trim().optional(),
  termsOfService: z.string().trim().optional(),
});

const broadcastNotificationSchema = z.object({
  audience: z.enum(['all', 'customer', 'vendor', 'delivery_partner']),
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(1000),
});

module.exports = {
  rejectVendorSchema,
  updateVendorSchema,
  updateDeliveryPartnerSchema,
  createProductSchema,
  updateProductSchema,
  categorySchema,
  rentalPlanSchema,
  updateSettingsSchema,
  broadcastNotificationSchema,
};
