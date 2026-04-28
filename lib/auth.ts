import type { NextRequest } from 'next/server'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { getJwtSecret } from './env'
import type { AuthUser, PublicUser, UserRole } from './types'

type UserRecord = {
  _id: unknown
  email: string
  role?: UserRole
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
  createdAt?: Date | string
  verified?: boolean
}

export function getAuthTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice('Bearer '.length).trim() || null
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.email !== 'string' ||
      typeof decoded.role !== 'string'
    ) {
      return null
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
      sessionId: typeof decoded.sessionId === 'string' ? decoded.sessionId : undefined,
    }
  } catch {
    return null
  }
}

export function getAuthenticatedUser(request: NextRequest): AuthUser | null {
  const token = getAuthTokenFromRequest(request)
  return token ? verifyAuthToken(token) : null
}

export function isAdmin(user: Pick<AuthUser, 'role'> | null | undefined): boolean {
  return user?.role === 'admin'
}

export function createAuthToken(
  payload: AuthUser,
  options: SignOptions = { expiresIn: '7d' }
): string {
  return jwt.sign(payload, getJwtSecret(), options)
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown'
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role || 'patient',
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    bloodType: user.bloodType,
    emergencyContact: user.emergencyContact,
    registeredDate: user.createdAt || new Date().toISOString(),
    verified: user.verified ?? false,
  }
}
