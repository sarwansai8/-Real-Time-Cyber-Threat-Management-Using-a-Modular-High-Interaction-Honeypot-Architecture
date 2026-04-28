import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db'
import { User } from '@/lib/models'
import { registerSchema, validateRequest, sanitizeObject } from '@/lib/validations'
import { authRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { toPublicUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await authRateLimit(clientId)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      )
    }

    await connectDB()
    
    const body = await request.json()
    
    // Validate and sanitize input
    const validation = validateRequest(registerSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }
    
    const sanitizedData = sanitizeObject(validation.data)
    const { email, password, ...profileData } = sanitizedData

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password with 12 rounds (strong security)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      ...profileData,
      role: 'patient',
      verified: false
    })

    // Remove password from response
    const userObject = user.toObject()
    const { password: _, ...userResponse } = userObject

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: toPublicUser(userResponse)
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
      }
    })

  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed', details: error.message },
      { status: 500 }
    )
  }
}
