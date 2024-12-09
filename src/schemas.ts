import { z } from 'zod';

// **1. User Validation Schema**
export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(['male', 'female', 'other']),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  is_premium: z.boolean().default(false),
  verified: z.boolean().default(false),
});

// **2. Profile Validation Schema**
export const profileSchema = z.object({
  bio: z.string().max(500, 'Bio cannot exceed 500 characters'),
  photo_url: z.string().url('Invalid URL'),
  user_id: z.string().uuid('Invalid user ID'),
});

// **3. Premium Package Validation Schema**
export const premiumPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().max(255, 'Description is too long'),
  price: z.number().min(0, 'Price must be positive'),
});

// **4. Swipe Validation Schema**
export const swipeSchema = z.object({
  swiper_id: z.string().uuid('Invalid swiper user ID'),
  swiped_user_id: z.string().uuid('Invalid swiped user ID'),
  swipe_type: z.enum(['LIKE', 'PASS']),
});

// **5. User Premium Subscription Validation Schema**
export const userPremiumSubscriptionSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  premium_package_id: z.string().uuid('Invalid premium package ID'),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format',
  }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format',
  }),
});

// **6. Daily Limit Validation Schema**
export const dailyLimitSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  swipe_count: z.number().min(0, 'Swipe count cannot be negative'),
});

// **7. Login Schema**
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

