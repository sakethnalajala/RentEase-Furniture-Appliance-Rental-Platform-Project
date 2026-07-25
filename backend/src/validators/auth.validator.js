const { z } = require('zod');
const { SELF_REGISTERABLE_ROLES, ALL_ROLES } = require('../constants/roles');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required.'),
    email: z.string().trim().toLowerCase().email('Invalid email address.'),
    password: passwordSchema,
    phone: z.string().trim().min(10).max(15).optional(),
    role: z.enum(SELF_REGISTERABLE_ROLES).default('customer'),
    // Vendor-only onboarding fields
    businessName: z.string().trim().optional(),
    cityId: z.string().trim().optional(),
    // Delivery-partner-only onboarding fields
    vehicleType: z.enum(['bike', 'van', 'truck']).optional(),
    vehicleNumber: z.string().trim().optional(),
    licenseNumber: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'vendor' && (!data.businessName || !data.cityId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'businessName and cityId are required to register as a vendor.',
        path: ['businessName'],
      });
    }
    if (data.role === 'delivery_partner' && (!data.vehicleType || !data.vehicleNumber || !data.licenseNumber || !data.cityId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'vehicleType, vehicleNumber, licenseNumber and cityId are required to register as a delivery partner.',
        path: ['vehicleType'],
      });
    }
  });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
  // The role tab the user selected on the login page. Required so login can be validated
  // strictly against it (see auth.controller.js's `login`) — without this, entering a Vendor
  // account's credentials while the Customer tab is selected would silently log in as Vendor
  // and open the Vendor Dashboard, which is exactly the bug this field exists to prevent.
  role: z.enum(ALL_ROLES),
  // Opt-in only — omitted/false means the refresh cookie is session-only (cleared when the
  // browser fully closes); true keeps the previous 30-day persistent-login behavior.
  rememberMe: z.coerce.boolean().optional().default(false),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address.'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required.'),
  newPassword: passwordSchema,
});

const otpRequestSchema = z.object({
  phone: z.string().trim().min(10).max(15),
});

const otpVerifySchema = z.object({
  phone: z.string().trim().min(10).max(15),
  code: z.string().length(6, 'OTP must be 6 digits.'),
});

const twoFaVerifySchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6, 'Authenticator code must be 6 digits.'),
});

const twoFaEnableSchema = z.object({
  code: z.string().length(6, 'Authenticator code must be 6 digits.'),
});

const selectGoogleAccountSchema = z.object({
  role: z.enum(ALL_ROLES),
  email: z.string().trim().toLowerCase().email('Invalid email address.'),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
  twoFaVerifySchema,
  twoFaEnableSchema,
  selectGoogleAccountSchema,
};
