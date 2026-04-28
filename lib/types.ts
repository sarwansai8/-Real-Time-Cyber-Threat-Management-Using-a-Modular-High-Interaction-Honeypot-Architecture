export type UserRole = 'patient' | 'admin' | 'doctor'

export interface AuthUser {
  userId: string
  email: string
  role: UserRole
  sessionId?: string
}

export interface PublicUser {
  id: string
  email: string
  role: UserRole
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  bloodType: string
  emergencyContact: string
  registeredDate: Date | string
  verified: boolean
}

export interface HealthUpdateSummary {
  id: string
  title: string
  summary: string
  content: string
  category: 'advisory' | 'prevention' | 'research' | 'outbreak' | 'vaccination'
  severity: 'low' | 'medium' | 'high' | 'critical'
  publishedDate: string
  publishedBy: string
  status: 'draft' | 'published' | 'archived'
  region: 'National' | 'Regional' | 'International'
  views: number
  savedCount: number
}
