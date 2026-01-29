import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AcceptInviteForm } from '@/components/team/accept-invite-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Get invitation details
  const { data: inviteData } = await supabase.rpc('get_invitation_by_token', {
    p_token: token,
  })

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Invalid or expired invitation
  if (!inviteData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {inviteData?.error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please ask the organization administrator to send you a new invitation.
            </p>
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User not logged in - redirect to login with return URL
  if (!user) {
    const loginUrl = `/login?next=/invite/${token}&email=${encodeURIComponent(inviteData.email)}`
    redirect(loginUrl)
  }

  // User logged in with different email
  if (user.email?.toLowerCase() !== inviteData.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to a different email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-2 p-4 bg-muted rounded-lg">
              <p>
                <span className="text-muted-foreground">Invitation for:</span>{' '}
                <strong>{inviteData.email}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">You're logged in as:</span>{' '}
                <strong>{user.email}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please log out and sign in with <strong>{inviteData.email}</strong> to accept this invitation.
            </p>
            <div className="flex gap-2">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
              <form action="/api/auth/signout" method="POST" className="flex-1">
                <Button type="submit" className="w-full">
                  Sign Out
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show accept invitation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {inviteData.org_name}</CardTitle>
          <CardDescription>
            You've been invited to join as a <strong className="capitalize">{inviteData.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm space-y-2 p-4 bg-muted rounded-lg">
              <p>
                <span className="text-muted-foreground">Organization:</span>{' '}
                <strong>{inviteData.org_name}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Your role:</span>{' '}
                <strong className="capitalize">{inviteData.role}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Invited by:</span>{' '}
                <strong>{inviteData.inviter_email}</strong>
              </p>
            </div>

            <AcceptInviteForm
              token={token}
              orgName={inviteData.org_name}
              role={inviteData.role}
            />

            <p className="text-xs text-center text-muted-foreground">
              By accepting, you'll gain access to shared savants, documents, and brand voice settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
