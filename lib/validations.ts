import { z } from 'zod'

// User Registration Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number'),
  address: z.string().min(5, 'Address is required').max(200),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  zipCode: z.string().min(4, 'Zip code must be at least 4 characters').max(10, 'Zip code too long'),
  bloodType: z.string().regex(/^(A|B|AB|O)[+-]$/, 'Invalid blood type'),
  emergencyContact: z.string().min(5, 'Emergency contact is required').max(200)
})

// User Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

// ID Validation
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')

// Appointment Schema
export const appointmentSchema = z.object({
  doctorName: z.string().min(2, 'Doctor name is required').max(100),
  specialty: z.string().min(2, 'Specialty is required').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  location: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(500).optional()
})

export const appointmentUpdateSchema = appointmentSchema.partial().extend({
  id: mongoIdSchema
})

// Medical Record Schema
export const medicalRecordSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  type: z.enum(['lab', 'prescription', 'diagnosis', 'imaging', 'other']),
  date: z.string().optional(),
  provider: z.string().min(2, 'Provider is required').max(100),
  description: z.string().max(1000).optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.string().optional(),
  confidential: z.boolean().optional().default(false)
})

export const medicalRecordUpdateSchema = medicalRecordSchema.partial().extend({
  id: mongoIdSchema
})

// Vaccination Schema
export const vaccinationSchema = z.object({
  vaccineName: z.string().min(2, 'Vaccine name is required').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  provider: z.string().min(2, 'Provider is required').max(100),
  batchNumber: z.string().max(50).optional(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(500).optional()
})

export const vaccinationUpdateSchema = vaccinationSchema.partial().extend({
  id: mongoIdSchema
})

// Health Update Schema
export const healthUpdateSchema = z.object({
  title: z.string().min(5, 'Title is required').max(200),
  content: z.string().min(20, 'Content is required'),
  summary: z.string().min(10, 'Summary is required').max(500),
  category: z.enum(['advisory', 'prevention', 'research', 'outbreak', 'vaccination']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  publishedDate: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  region: z.enum(['National', 'Regional', 'International']).optional().default('National')
})

export const healthUpdateUpdateSchema = healthUpdateSchema.partial().extend({
  id: mongoIdSchema
})

export const profileUpdateSchema = registerSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  bloodType: true,
  emergencyContact: true,
}).partial()

export const adminUserUpdateSchema = z.object({
  userId: mongoIdSchema,
  role: z.enum(['patient', 'admin', 'doctor']).optional(),
  verified: z.boolean().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number').optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
})

// Pagination Schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Search Schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  fields: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional()
})

// Export validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

// Sanitization helpers
export function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as any
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as any
    } else {
      sanitized[key as keyof T] = value
    }
  }
  return sanitized
}
