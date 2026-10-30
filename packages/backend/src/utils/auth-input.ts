import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(50);
const newPassword = z
  .string()
  .min(8)
  .refine(value => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be at most 72 UTF-8 bytes',
  });

export const registerInput = z.object({
  email,
  password: newPassword,
  name: z.string().trim().min(1).max(50).optional(),
  gender: z.number().int().min(0).max(255).optional(),
  phone: z
    .string()
    .regex(/^\d{11}$/)
    .optional(),
});

// Existing six-character passwords remain valid at login.
export const loginInput = z.object({ email, password: z.string().min(1).max(1024) });
export const changeAuthInput = z.object({
  oldPassword: z.string().min(1).max(1024),
  password: newPassword.optional(),
  phone: z
    .string()
    .regex(/^\d{11}$/)
    .optional(),
  email: email.optional(),
});
export const verificationInput = z.object({
  email,
  code: z.number().int().min(100000).max(999999),
});
