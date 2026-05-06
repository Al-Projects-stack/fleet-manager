import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email format').toLowerCase().trim(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z
      .enum(['Admin', 'Manager', 'Technician', 'ReadOnly'])
      .default('ReadOnly'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
