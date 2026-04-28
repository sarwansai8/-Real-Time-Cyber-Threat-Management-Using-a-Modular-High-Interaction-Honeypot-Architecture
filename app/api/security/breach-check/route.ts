import { NextRequest, NextResponse } from 'next/server'
import { checkPasswordBreach, checkEmailBreach, analyzePasswordSecurity } from '@/lib/breach-monitor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, value } = body

    if (type === 'password') {
      const breachResult = await checkPasswordBreach(value)
      const analysis = analyzePasswordSecurity(value)
      return NextResponse.json({ breach: breachResult, analysis })
    }

    if (type === 'email') {
      const result = await checkEmailBreach(value)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid type. Use "password" or "email".' }, { status: 400 })
  } catch (error) {
    console.error('Breach check error:', error)
    return NextResponse.json({ error: 'Breach check failed' }, { status: 500 })
  }
}
