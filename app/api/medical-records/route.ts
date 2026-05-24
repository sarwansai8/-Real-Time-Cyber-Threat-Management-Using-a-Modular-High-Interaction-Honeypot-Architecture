import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { MedicalRecord } from '@/lib/models'
import { logAudit } from '@/lib/audit-logger'
import {
  medicalRecordSchema,
  medicalRecordUpdateSchema,
  mongoIdSchema,
  sanitizeObject,
  validateRequest,
} from '@/lib/validations'
import { getAuthenticatedUser, getClientIp, getUserAgent } from '@/lib/auth'
import { escapeRegex } from '@/lib/utils'
import { encryptMedicalRecord, decryptMedicalRecord } from '@/lib/field-encryption'
import { createIntegrityMetadata, verifyRecordIntegrity } from '@/lib/record-integrity'
import { createSecurityEvent } from '@/lib/security-events'
import { csrfProtection } from '@/lib/advanced-security'

async function logSecurityEventSafely(request: NextRequest, payload: Parameters<typeof createSecurityEvent>[0]) {
  try {
    await createSecurityEvent(payload, { request })
  } catch (error) {
    console.error('Security event logging failed during medical records flow:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100)
    const search = searchParams.get('search')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''

    const query: Record<string, unknown> = { userId: user.userId }

    if (type && type !== 'all') {
      query.type = type
    }

    if (search) {
      const pattern = escapeRegex(search)
      query.$or = [
        { title: { $regex: pattern, $options: 'i' } },
        { provider: { $regex: pattern, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, records] = await Promise.all([
      MedicalRecord.countDocuments(query),
      MedicalRecord.find(query)
        .select('-__v')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    // Verify cryptographic integrity and decrypt records on-the-fly
    const decryptedRecords = records.map((rec: any) => {
      if (!rec.salt || !rec.integrity) {
        // Return legacy plaintext records as-is, but mark them as unprotected
        return { ...rec, integrityStatus: 'unprotected' }
      }

      // 1. Cryptographic integrity check
      const verification = verifyRecordIntegrity(rec, rec.integrity)
      if (verification.tampered) {
        console.warn(`🚨 [INTEGRITY VIOLATION] Tamper detected on record ${rec._id}`)
        
        // Log critical security event for audit trail
        logSecurityEventSafely(request, {
          type: 'suspicious_behavior',
          severity: 'critical',
          ipAddress: getClientIp(request),
          deviceInfo: {
            userAgent: getUserAgent(request),
            platform: 'Unknown',
            language: 'Unknown',
          },
          sessionData: { sessionId: 'server', pageViews: 1, referrer: '' },
          details: `HMAC-SHA-256 verification failed for medical record ${rec._id} (User: ${user.userId}). Critical data integrity warning!`,
        })
      }

      // 2. AES-256-GCM Field Decryption
      try {
        const decrypted = decryptMedicalRecord(rec, user.userId, rec.salt)
        return {
          ...decrypted,
          integrityStatus: verification.isValid ? 'verified' : 'tampered',
        }
      } catch (err) {
        console.error(`Failed to decrypt medical record ${rec._id}:`, err)
        return {
          ...rec,
          description: '[DECRYPTION_ERROR: Master key or user derivation salt mismatch]',
          integrityStatus: 'error',
        }
      }
    })

    return NextResponse.json({
      success: true,
      records: decryptedRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Fetch medical records error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical records', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection
    const csrfViolation = await csrfProtection(request)
    if (csrfViolation) {
      return csrfViolation
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(medicalRecordSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // 1. AES-256-GCM Encryption
    const { encrypted, salt } = encryptMedicalRecord(validation.data, user.userId)

    // 2. Cryptographic signature generation (HMAC-SHA-256)
    const integrity = createIntegrityMetadata(encrypted, user.userId)

    const record = await MedicalRecord.create({
      ...encrypted,
      salt,
      integrity,
      userId: user.userId,
    })

    await logAudit({
      userId: user.userId,
      action: 'create',
      resource: 'medical-records',
      resourceId: (record as any)._id.toString(),
      details: { method: 'POST', endpoint: '/api/medical-records', title: record.title },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    // Decrypt the record model before returning so UI gets clean fields
    const decryptedRecord = {
      ...decryptMedicalRecord(record.toObject(), user.userId, salt),
      integrityStatus: 'verified',
    }

    return NextResponse.json({ success: true, record: decryptedRecord }, { status: 201 })
  } catch (error: any) {
    console.error('Create medical record error:', error)
    return NextResponse.json(
      { error: 'Failed to create medical record', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // CSRF Protection
    const csrfViolation = await csrfProtection(request)
    if (csrfViolation) {
      return csrfViolation
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const validation = validateRequest(medicalRecordUpdateSchema, sanitizeObject(body))

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { id, ...updates } = validation.data

    // 1. Fetch existing record
    const existingRecord = await MedicalRecord.findOne({ _id: id, userId: user.userId })
    if (!existingRecord) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
    }

    // 2. Decrypt existing record to merge update fields
    let decrypted: any = existingRecord.toObject()
    if (existingRecord.salt) {
      try {
        decrypted = decryptMedicalRecord(decrypted, user.userId, existingRecord.salt)
      } catch (err) {
        console.error('Failed to decrypt old record during update, using as-is:', err)
      }
    }

    // 3. Construct updated decrypted state
    const updatedDecrypted = {
      ...decrypted,
      ...updates,
    }

    // 4. Encrypt whole document
    const { encrypted, salt: newSalt } = encryptMedicalRecord(
      updatedDecrypted,
      user.userId,
      existingRecord.salt || undefined
    )

    // 5. Generate fresh HMAC-SHA-256 signature
    const integrity = createIntegrityMetadata(encrypted, user.userId)

    // 6. Update database record
    const record = await MedicalRecord.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { 
        $set: {
          ...encrypted,
          salt: newSalt,
          integrity,
        }
      },
      { new: true, runValidators: true }
    )

    if (!record) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'update',
      resource: 'medical-records',
      resourceId: id,
      details: { method: 'PATCH', endpoint: '/api/medical-records', changes: updates },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'warning',
    })

    // Decrypt the record model before returning so UI gets clean fields
    const decryptedRecord = {
      ...decryptMedicalRecord(record.toObject(), user.userId, newSalt),
      integrityStatus: 'verified',
    }

    return NextResponse.json({ success: true, record: decryptedRecord })
  } catch (error: any) {
    console.error('Update medical record error:', error)
    return NextResponse.json(
      { error: 'Failed to update medical record', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // CSRF Protection
    const csrfViolation = await csrfProtection(request)
    if (csrfViolation) {
      return csrfViolation
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const idValidation = validateRequest(mongoIdSchema, id)

    if (!idValidation.success) {
      return NextResponse.json({ error: 'Medical record ID required' }, { status: 400 })
    }

    const record = await MedicalRecord.findOneAndDelete({
      _id: idValidation.data,
      userId: user.userId,
    })

    if (!record) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
    }

    await logAudit({
      userId: user.userId,
      action: 'delete',
      resource: 'medical-records',
      resourceId: idValidation.data,
      details: { method: 'DELETE', endpoint: '/api/medical-records', title: record.title },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      complianceCategory: 'data_modification',
      severity: 'critical',
    })

    return NextResponse.json({ success: true, message: 'Medical record deleted' })
  } catch (error: any) {
    console.error('Delete medical record error:', error)
    return NextResponse.json(
      { error: 'Failed to delete medical record', details: error.message },
      { status: 500 }
    )
  }
}

