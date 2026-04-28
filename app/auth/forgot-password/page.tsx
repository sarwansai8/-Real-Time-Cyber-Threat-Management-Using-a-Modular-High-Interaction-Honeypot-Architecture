'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <Card className="border-border shadow-md">
        <CardHeader className="border-b border-border pb-6">
          <CardTitle className="text-2xl">Password Help</CardTitle>
          <CardDescription>Recovery options for your health portal account</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              Self-service password reset is not configured in this demo environment yet. Use the test credentials shown on the sign-in page, or contact an administrator for account recovery.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button asChild className="flex-1">
              <Link href="/auth/login">Back To Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/auth/register">Create Account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
