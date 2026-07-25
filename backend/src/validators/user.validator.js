const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(10).max(15).optional(),
  avatar: z.string().url().optional(),
});

const selectCitySchema = z.object({
  cityId: z.string().min(1, 'cityId is required.'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
    .regex(/[0-9]/, 'Password must contain a number.'),
});

module.exports = { updateProfileSchema, selectCitySchema, changePasswordSchema };
